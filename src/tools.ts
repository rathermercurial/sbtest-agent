/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() })
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  }
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  inputSchema: scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  }
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  }
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  }
});

/**
 * Search SuperBenefit knowledge base for general information
 * Uses Cloudflare AI Search AutoRAG for retrieval-augmented generation
 */
const searchKnowledge = tool({
  description:
    "Search the SuperBenefit knowledge base for general information about SuperBenefit, its mission, community, operations, and general questions about the organization",
  inputSchema: z.object({
    query: z.string().describe("The search question or topic")
  }),
  execute: async ({ query }) => {
    const { agent } = getCurrentAgent<Chat>();
    const env = agent!.getEnv();

    console.log(`Searching knowledge base for: ${query}`);
    try {
      const result = await env.AI.autorag("sbknowledge-test").aiSearch({
        query,
        rewrite_query: true, // Optimize query for better retrieval
        max_num_results: 8, // Balance context vs precision
        ranking_options: {
          score_threshold: 0.65 // Filter low-confidence results
        }
      });

      // Return structured response with answer and sources
      const sources =
        result.data && result.data.length > 0
          ? result.data
              .map((d: any) => `- ${d.filename} (score: ${d.score.toFixed(2)})`)
              .join("\n")
          : "No sources available";

      return `${result.response}\n\nSources:\n${sources}`;
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      return `I apologize, but I encountered an error searching the knowledge base: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

/**
 * Search SuperBenefit governance documentation
 * Uses Cloudflare AI Search AutoRAG for governance-specific queries
 */
const searchGovernance = tool({
  description:
    "Search SuperBenefit governance documentation for information about decision-making processes, policies, proposals, voting, organizational structure, and governance-related questions",
  inputSchema: z.object({
    query: z.string().describe("The governance-related question or topic")
  }),
  execute: async ({ query }) => {
    const { agent } = getCurrentAgent<Chat>();
    const env = agent!.getEnv();

    console.log(`Searching governance docs for: ${query}`);
    try {
      const result = await env.AI.autorag("sbgov-test").aiSearch({
        query,
        rewrite_query: true, // Optimize query for better retrieval
        max_num_results: 8, // Balance context vs precision
        ranking_options: {
          score_threshold: 0.65 // Filter low-confidence results
        }
      });

      // Return structured response with answer and sources
      const sources =
        result.data && result.data.length > 0
          ? result.data
              .map((d: any) => `- ${d.filename} (score: ${d.score.toFixed(2)})`)
              .join("\n")
          : "No sources available";

      return `${result.response}\n\nSources:\n${sources}`;
    } catch (error) {
      console.error("Error searching governance docs:", error);
      return `I apologize, but I encountered an error searching the governance documentation: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,
  searchKnowledge,
  searchGovernance
} satisfies ToolSet;

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  }
};
