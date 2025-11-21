# Cloudflare AI Search Integration Research

## Overview

This document contains research findings for integrating Cloudflare AI Search with the SB Test Agent.

## What is Cloudflare AI Search?

Cloudflare AI Search is a serverless Retrieval-Augmented Generation (RAG) solution that enables:
- **Vector search** across uploaded documents
- **Automatic embeddings** generation for content
- **Semantic search** with reranking capabilities
- **AutoRAG** - Automated retrieval augmented generation combining search + LLM response

## AutoRAG Architecture

AutoRAG combines multiple components:

1. **Document Ingestion**: Upload documents to create searchable knowledge bases
2. **Embedding Generation**: Automatic vectorization of content
3. **Vector Search**: Semantic similarity search across documents
4. **Reranking**: Semantic reordering of results for better relevance
5. **LLM Generation**: Contextual answer generation based on retrieved documents

## Workers AI Binding

### Configuration

Already configured in `wrangler.jsonc`:

```json
{
  "ai": {
    "binding": "AI",
    "remote": true
  }
}
```

This makes the AI service available via `env.AI` in worker code.

### AutoRAG API Method

Primary method for RAG operations:

```typescript
const answer = await env.AI.autorag("autorag-source-name").aiSearch({
  query: "Your search question",
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",  // Optional
  rewrite_query: true,                                 // Optional
  max_num_results: 10,                                 // Optional (1-50)
  stream: false,                                       // Optional
  ranking_options: {                                   // Optional
    score_threshold: 0.7                              // 0-1
  },
  reranking: {                                        // Optional
    enabled: true,
    model: "jina-reranker-v2-base-multilingual"      // Optional
  }
});
```

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | The search question/input |
| `model` | string | No | Configured default | LLM model for generation |
| `rewrite_query` | boolean | No | false | Optimize query for better retrieval |
| `max_num_results` | number | No | 10 | Limit results (1-50) |
| `stream` | boolean | No | false | Enable streaming responses |
| `ranking_options.score_threshold` | number | No | - | Filter results by score (0-1) |
| `reranking.enabled` | boolean | No | false | Enable semantic reranking |
| `reranking.model` | string | No | - | Reranking model to use |

### Response Structure

```typescript
{
  search_query: string;      // The processed search query
  response: string;          // Generated answer from LLM
  data: Array<{             // Retrieved documents
    file_id: string;
    filename: string;
    score: number;          // Relevance score
    attributes: object;     // Custom metadata
  }>;
}
```

## Best Practices for RAG Implementation

### 1. Query Optimization

- **Enable `rewrite_query: true`** for complex user questions
- This transforms natural language into optimized search queries
- Improves retrieval accuracy significantly

### 2. Result Filtering

- **Set appropriate `score_threshold`** to filter low-confidence results
- Recommended: 0.6-0.8 for most use cases
- Higher threshold = more precision, potentially fewer results

### 3. Reranking

- **Enable reranking** when precision is critical
- Adds semantic understanding beyond vector similarity
- Slight performance trade-off for better accuracy

### 4. Result Limits

- **Use `max_num_results`** to control context size
- More results = more context but longer processing
- Recommended: 5-10 for most chat applications

### 5. Streaming

- **Enable `stream: true`** for better UX with long responses
- Allows progressive display of answers
- Essential for real-time chat interfaces

## Integration Strategy for SB Test Agent

### Two Knowledge Sources

1. **sbknowledge-test**: SuperBenefit general knowledge base
2. **sbgov-test**: SuperBenefit governance information

### Tool-Based Approach

Create separate tools for each knowledge source:

```typescript
// Knowledge search tool
const searchKnowledge = tool({
  description: "Search SuperBenefit knowledge base for information",
  inputSchema: z.object({
    query: z.string().describe("The search question")
  }),
  execute: async ({ query }) => {
    const result = await env.AI.autorag("sbknowledge-test").aiSearch({
      query,
      rewrite_query: true,
      max_num_results: 8,
      ranking_options: { score_threshold: 0.65 },
      reranking: { enabled: true }
    });
    return result.response;
  }
});

// Governance search tool
const searchGovernance = tool({
  description: "Search SuperBenefit governance documentation",
  inputSchema: z.object({
    query: z.string().describe("The governance-related question")
  }),
  execute: async ({ query }) => {
    const result = await env.AI.autorag("sbgov-test").aiSearch({
      query,
      rewrite_query: true,
      max_num_results: 8,
      ranking_options: { score_threshold: 0.65 },
      reranking: { enabled: true }
    });
    return result.response;
  }
});
```

### Alternative: Context Injection Approach

Instead of tools, inject search results directly into context:

```typescript
async onChatMessage() {
  const userMessage = this.messages[this.messages.length - 1];

  // Perform searches in parallel
  const [knowledgeResult, govResult] = await Promise.all([
    env.AI.autorag("sbknowledge-test").aiSearch({
      query: userMessage.text,
      max_num_results: 5
    }),
    env.AI.autorag("sbgov-test").aiSearch({
      query: userMessage.text,
      max_num_results: 5
    })
  ]);

  // Add to system prompt
  const systemPrompt = `
    You are SB Knowledge Search assistant.

    Relevant Knowledge Base Information:
    ${knowledgeResult.response}

    Relevant Governance Information:
    ${govResult.response}

    Use this information to answer user questions accurately.
  `;
}
```

## Recommended Approach: Hybrid

**Best practice: Combine both approaches**

1. **Automatic context injection** for every query (background search)
2. **Explicit tools** for targeted deep dives

This provides:
- **Automatic relevance**: Every response is RAG-enhanced
- **User control**: Users can explicitly search specific sources
- **Better UX**: Seamless knowledge integration

## Implementation Checklist

- [x] AI binding already configured in wrangler.jsonc
- [x] Env types include AI binding
- [ ] Create search tools in tools.ts
- [ ] Add env.AI access to tool execution
- [ ] Update system prompt to mention knowledge sources
- [ ] Test with both sources
- [ ] Add error handling for search failures
- [ ] Document tool usage for users

## References

- Cloudflare AI Search Docs: https://developers.cloudflare.com/ai-search/
- Workers AI Binding: https://developers.cloudflare.com/ai-search/usage/workers-binding/
- Cloudflare Agents: https://developers.cloudflare.com/agents/
