# 🔍 SB Knowledge Search

![npm i agents command](./npm-agents-banner.svg)

<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/agents-starter"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare"/></a>

An AI-powered knowledge search agent for SuperBenefit, built on Cloudflare's Agent platform with [`agents`](https://www.npmjs.com/package/agents). This agent provides intelligent search across SuperBenefit's knowledge base and governance documentation using Cloudflare AI Search AutoRAG.

## Features

- 🔍 **AI Search Integration** - Retrieval-augmented generation from multiple knowledge sources
- 💬 Interactive full-frame responsive chat interface
- 🛠️ Built-in tool system with automatic execution
- 📅 Advanced task scheduling (one-time, delayed, and recurring via cron)
- 🌓 Dark/Light theme support
- ⚡️ Real-time streaming responses
- 🔄 State management and chat history
- 🎨 Modern, full-frame responsive UI
- 📚 Dual knowledge sources (general knowledge + governance)

## Knowledge Sources

This agent searches two specialized AutoRAG sources:

1. **sbknowledge-test** - SuperBenefit general knowledge base
   - Mission, vision, values
   - Community information
   - Operations and programs

2. **sbgov-test** - SuperBenefit governance documentation
   - Decision-making processes
   - Policies and proposals
   - Voting procedures
   - Organizational structure

## Prerequisites

- Cloudflare account
- OpenAI API key
- **AutoRAG sources configured in Cloudflare:**
  - `sbknowledge-test` (general knowledge)
  - `sbgov-test` (governance documentation)

## Quick Start

1. Clone the repository:

```bash
git clone <repository-url>
cd sbtest-agent
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment:

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

Get your API key from: https://platform.openai.com/api-keys

4. Run locally:

```bash
npm run dev
```

5. Test the knowledge search:

Try these queries in the chat interface:
- "What is SuperBenefit's mission?"
- "How are decisions made in SuperBenefit?"
- "Tell me about the governance process"

6. Deploy to production:

First, set your production secrets:

```bash
wrangler secret put OPENAI_API_KEY
```

Then deploy:

```bash
npm run deploy
```

**Important:** Ensure your AutoRAG sources (`sbknowledge-test` and `sbgov-test`) are configured in your Cloudflare account before deploying.

## Project Structure

```
├── src/
│   ├── app.tsx        # Full-frame responsive chat UI
│   ├── server.ts      # Chat agent logic with AI Search integration
│   ├── tools.ts       # Tool definitions (including AI Search tools)
│   ├── utils.ts       # Helper functions
│   └── styles.css     # UI styling with Tailwind
├── temp/
│   ├── AI_SEARCH_RESEARCH.md      # AI Search integration research
│   ├── IMPLEMENTATION_PLAN.md     # Implementation documentation
│   └── HANDOFF_SUMMARY.md         # Complete handoff documentation
├── wrangler.jsonc     # Cloudflare Workers configuration
├── .dev.vars.example  # Environment variables template
└── README.md          # This file
```

## AI Search Tools

This agent includes two specialized tools that automatically search knowledge sources:

### searchKnowledge

Searches the general SuperBenefit knowledge base for information about mission, community, operations, and programs.

**Example queries:**
- "What is SuperBenefit's mission?"
- "Tell me about the SuperBenefit community"
- "What programs does SuperBenefit offer?"

**Implementation:**
```typescript
const searchKnowledge = tool({
  description: "Search the SuperBenefit knowledge base...",
  inputSchema: z.object({
    query: z.string().describe("The search question or topic")
  }),
  execute: async ({ query }) => {
    const result = await env.AI.autorag("sbknowledge-test").aiSearch({
      query,
      rewrite_query: true,
      max_num_results: 8,
      ranking_options: { score_threshold: 0.65 }
    });
    return `${result.response}\n\nSources:\n${sources}`;
  }
});
```

### searchGovernance

Searches SuperBenefit governance documentation for policies, decision-making processes, and organizational structure.

**Example queries:**
- "How are decisions made in SuperBenefit?"
- "What is the proposal process?"
- "Who has voting rights?"

**Implementation:**
```typescript
const searchGovernance = tool({
  description: "Search SuperBenefit governance documentation...",
  inputSchema: z.object({
    query: z.string().describe("The governance-related question")
  }),
  execute: async ({ query }) => {
    const result = await env.AI.autorag("sbgov-test").aiSearch({
      query,
      rewrite_query: true,
      max_num_results: 8,
      ranking_options: { score_threshold: 0.65 }
    });
    return `${result.response}\n\nSources:\n${sources}`;
  }
});
```

Both tools:
- Use AutoRAG for optimized retrieval
- Enable query rewriting for better results
- Filter results by score threshold (0.65)
- Return answers with source citations
- Handle errors gracefully

## Customization Guide

### Adding New Tools

Add new tools in `tools.ts` using the tool builder:

```ts
// Example of a tool that requires confirmation
const searchDatabase = tool({
  description: "Search the database for user records",
  parameters: z.object({
    query: z.string(),
    limit: z.number().optional()
  })
  // No execute function = requires confirmation
});

// Example of an auto-executing tool
const getCurrentTime = tool({
  description: "Get current server time",
  parameters: z.object({}),
  execute: async () => new Date().toISOString()
});

// Scheduling tool implementation
const scheduleTask = tool({
  description:
    "schedule a task to be executed at a later time. 'when' can be a date, a delay in seconds, or a cron pattern.",
  parameters: z.object({
    type: z.enum(["scheduled", "delayed", "cron"]),
    when: z.union([z.number(), z.string()]),
    payload: z.string()
  }),
  execute: async ({ type, when, payload }) => {
    // ... see the implementation in tools.ts
  }
});
```

To handle tool confirmations, add execution functions to the `executions` object:

```typescript
export const executions = {
  searchDatabase: async ({
    query,
    limit
  }: {
    query: string;
    limit?: number;
  }) => {
    // Implementation for when the tool is confirmed
    const results = await db.search(query, limit);
    return results;
  }
  // Add more execution handlers for other tools that require confirmation
};
```

Tools can be configured in two ways:

1. With an `execute` function for automatic execution
2. Without an `execute` function, requiring confirmation and using the `executions` object to handle the confirmed action. NOTE: The keys in `executions` should match `toolsRequiringConfirmation` in `app.tsx`.

### Use a different AI model provider

The starting [`server.ts`](https://github.com/cloudflare/agents-starter/blob/main/src/server.ts) implementation uses the [`ai-sdk`](https://sdk.vercel.ai/docs/introduction) and the [OpenAI provider](https://sdk.vercel.ai/providers/ai-sdk-providers/openai), but you can use any AI model provider by:

1. Installing an alternative AI provider for the `ai-sdk`, such as the [`workers-ai-provider`](https://sdk.vercel.ai/providers/community-providers/cloudflare-workers-ai) or [`anthropic`](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic) provider:
2. Replacing the AI SDK with the [OpenAI SDK](https://github.com/openai/openai-node)
3. Using the Cloudflare [Workers AI + AI Gateway](https://developers.cloudflare.com/ai-gateway/providers/workersai/#workers-binding) binding API directly

For example, to use the [`workers-ai-provider`](https://sdk.vercel.ai/providers/community-providers/cloudflare-workers-ai), install the package:

```sh
npm install workers-ai-provider
```

Add an `ai` binding to `wrangler.jsonc`:

```jsonc
// rest of file
  "ai": {
    "binding": "AI"
  }
// rest of file
```

Replace the `@ai-sdk/openai` import and usage with the `workers-ai-provider`:

```diff
// server.ts
// Change the imports
- import { openai } from "@ai-sdk/openai";
+ import { createWorkersAI } from 'workers-ai-provider';

// Create a Workers AI instance
+ const workersai = createWorkersAI({ binding: env.AI });

// Use it when calling the streamText method (or other methods)
// from the ai-sdk
- const model = openai("gpt-4o-2024-11-20");
+ const model = workersai("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b")
```

Commit your changes and then run the `agents-starter` as per the rest of this README.

### Modifying the UI

The chat interface is built with React and features a modern, full-frame responsive design:

**Layout:**
- CSS Grid layout (`grid-rows-[auto_1fr_auto]`) for header, messages, and input
- Full viewport width on all screen sizes
- No horizontal scrolling
- Responsive padding and spacing

**Responsive Breakpoints:**
- Mobile: Full-width, edge-to-edge design
- Tablet (≥640px): `max-w-3xl` with padding
- Desktop (≥1024px): `max-w-4xl` for optimal readability

**Customization options in `app.tsx`:**
- Modify theme colors in `styles.css`
- Add new UI components in the chat container
- Customize message rendering and tool confirmation dialogs
- Add new controls to the header
- Adjust responsive breakpoints

**Key UI improvements:**
- All sections (header, messages, input) use consistent padding
- Messages scroll smoothly without layout conflicts
- Typography scales responsively (`text-sm sm:text-base`)
- Enhanced readability with `leading-relaxed` line height

### Example Use Cases

1. **Customer Support Agent**
   - Add tools for:
     - Ticket creation/lookup
     - Order status checking
     - Product recommendations
     - FAQ database search

2. **Development Assistant**
   - Integrate tools for:
     - Code linting
     - Git operations
     - Documentation search
     - Dependency checking

3. **Data Analysis Assistant**
   - Build tools for:
     - Database querying
     - Data visualization
     - Statistical analysis
     - Report generation

4. **Personal Productivity Assistant**
   - Implement tools for:
     - Task scheduling with flexible timing options
     - One-time, delayed, and recurring task management
     - Task tracking with reminders
     - Email drafting
     - Note taking

5. **Scheduling Assistant**
   - Build tools for:
     - One-time event scheduling using specific dates
     - Delayed task execution (e.g., "remind me in 30 minutes")
     - Recurring tasks using cron patterns
     - Task payload management
     - Flexible scheduling patterns

Each use case can be implemented by:

1. Adding relevant tools in `tools.ts`
2. Customizing the UI for specific interactions
3. Extending the agent's capabilities in `server.ts`
4. Adding any necessary external API integrations

## What's New

This branch includes significant enhancements to the chat agent:

### 🔍 AI Search Integration
- **Dual Knowledge Sources**: Integrated Cloudflare AI Search AutoRAG with two specialized sources
- **searchKnowledge Tool**: Automatic search of SuperBenefit general knowledge base
- **searchGovernance Tool**: Automatic search of governance documentation
- **Optimized RAG**: Query rewriting, score filtering, and source citations

### 🎨 Full-Frame Responsive UI
- **True Full-Frame**: Uses 100% viewport width on all devices
- **CSS Grid Layout**: Proper layout structure without positioning conflicts
- **Responsive Design**: Breakpoints for mobile, tablet, and desktop
- **No Horizontal Scroll**: Guaranteed overflow-x prevention
- **Enhanced Typography**: Better readability with responsive text sizing

### 📚 Documentation
- **Comprehensive Handoff Docs**: Complete implementation documentation in `/temp/`
- **Environment Setup**: Clear `.dev.vars.example` with proper instructions
- **Research Documentation**: AI Search best practices and integration strategies

### 🛠️ Technical Improvements
- Fixed layout conflicts with CSS Grid
- Removed absolute positioning issues
- Consistent padding across all sections
- Public `getEnv()` accessor for tool access to bindings
- Enhanced system prompt for intelligent tool selection

## Learn More

- [`agents`](https://github.com/cloudflare/agents/blob/main/packages/agents/README.md)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare AI Search Documentation](https://developers.cloudflare.com/ai-search/)
- [AI Search Workers Binding](https://developers.cloudflare.com/ai-search/usage/workers-binding/)

## Documentation

Detailed documentation is available in the `/temp/` directory:

- **AI_SEARCH_RESEARCH.md** - Research findings and best practices for AI Search
- **IMPLEMENTATION_PLAN.md** - Step-by-step implementation strategy
- **HANDOFF_SUMMARY.md** - Complete handoff documentation with testing guide

## License

MIT
