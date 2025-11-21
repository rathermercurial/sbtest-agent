# AI Search Integration - Implementation Plan

## Project Goal

Integrate Cloudflare AI Search into the SB Test Agent to enable retrieval-augmented generation (RAG) from two knowledge sources:
- **sbknowledge-test**: SuperBenefit general knowledge
- **sbgov-test**: SuperBenefit governance information

## Architecture Decision: Tool-Based RAG

Implement explicit search tools that the agent can intelligently invoke:

- `searchKnowledge`: Search the general knowledge base
- `searchGovernance`: Search governance documentation

**Benefits:**
- User has visibility into which sources were consulted
- Agent can intelligently choose which source to query
- Tool results visible in UI (ToolInvocationCard)
- Follows existing tool pattern in codebase
- Easier to debug and optimize

## Implementation Steps

### Phase 1: Add Search Tools

#### 1.1 Create AI Search Tools in tools.ts

Add two new tools with auto-execution:

```typescript
const searchKnowledge = tool({
  description: "Search the SuperBenefit knowledge base for general information about SuperBenefit, its mission, community, and operations",
  inputSchema: z.object({
    query: z.string().describe("The search question or topic")
  }),
  execute: async ({ query }, { env }) => {
    // Implementation in execute function
  }
});

const searchGovernance = tool({
  description: "Search SuperBenefit governance documentation for information about decision-making, policies, proposals, and organizational structure",
  inputSchema: z.object({
    query: z.string().describe("The governance-related question or topic")
  }),
  execute: async ({ query }, { env }) => {
    // Implementation in execute function
  }
});
```

#### 1.2 Tool Execution Logic

Best practices for AI Search:
- Enable `rewrite_query: true` for better retrieval
- Set `max_num_results: 8` for balanced context
- Use `score_threshold: 0.65` to filter low-quality results
- Enable `reranking` for better semantic relevance
- Return both answer and source citations

### Phase 2: Update Tool System

#### 2.1 Check utils.ts for processToolCalls

Need to ensure env is passed through to tool execution context.

#### 2.2 Update System Prompt

Enhance system prompt to describe available knowledge sources and when to use each tool.

### Phase 3: Frontend Integration

#### 3.1 Update Welcome Message (Optional)

Update welcome card to mention knowledge search capabilities.

## Files to Modify

1. ✅ `wrangler.jsonc` - AI binding already configured
2. ✅ `env.d.ts` - AI type already present
3. ⬜ `src/tools.ts` - Add searchKnowledge and searchGovernance tools
4. ⬜ `src/utils.ts` - Check/update processToolCalls if needed
5. ⬜ `src/server.ts` - Update system prompt
6. ⬜ `src/app.tsx` - Update welcome message (optional)

## Implementation Details

### Tool Configuration

Both tools will use these optimized parameters:

```typescript
const result = await env.AI.autorag("source-name").aiSearch({
  query,
  rewrite_query: true,              // Optimize query for better retrieval
  max_num_results: 8,                // Balance context vs precision
  ranking_options: {
    score_threshold: 0.65            // Filter low-confidence results
  },
  reranking: {
    enabled: true                    // Semantic reranking for better relevance
  }
});
```

### Error Handling

All tools should:
- Log errors to console
- Return user-friendly error messages
- Handle network failures gracefully
- Provide fallback responses

### Response Format

Tools should return structured data:
```typescript
{
  answer: string,                    // The generated answer
  sources: Array<{                   // Source citations
    filename: string,
    score: number
  }>
}
```

## Testing Strategy

### Manual Test Cases

1. **Knowledge Base Queries:**
   - "What is SuperBenefit's mission?"
   - "Tell me about the SuperBenefit community"
   - "How does SuperBenefit work?"

2. **Governance Queries:**
   - "How are decisions made in SuperBenefit?"
   - "What is the proposal process?"
   - "Who has voting rights in SuperBenefit?"

3. **Cross-Source Questions:**
   - "How does SuperBenefit's governance support its mission?"
   - Should intelligently use both tools

### Validation Criteria

- ✅ Tools invoke successfully
- ✅ Relevant results returned from knowledge base
- ✅ Source citations included
- ✅ Error handling works
- ✅ Response time < 3 seconds
- ✅ No horizontal scroll (existing UI requirement)

## Deployment Checklist

- [ ] Verify sbknowledge-test source exists and is populated
- [ ] Verify sbgov-test source exists and is populated
- [ ] Test in local development
- [ ] Review response quality
- [ ] Optimize parameters if needed
- [ ] Deploy to production
- [ ] Monitor usage and performance

## Success Criteria

- Both AI Search sources integrated and functional
- Agent can intelligently choose which source to query
- Responses are accurate and cite sources
- Tool invocations visible in UI
- No regressions in existing functionality
- Clean handoff documentation in /temp directory

## Handoff Documentation

All research and planning documents in `/temp/`:
- `AI_SEARCH_RESEARCH.md` - Research findings
- `IMPLEMENTATION_PLAN.md` - This implementation plan

This allows clean handoff to new Claude Code session if needed.
