import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { DynalistClient, DynalistService } from '@harnyk/dynalist-api';
import { createDynalistTools } from './dynalist-tools.js';

const SYSTEM_PROMPT = `You are a Dynalist assistant that helps users manage their lists and documents efficiently.
You can create lists, add items hierarchically, organize content, check/uncheck items, and perform various list management operations.

You have access to comprehensive Dynalist tools to help users with:
- Creating and managing lists
- Adding items with hierarchy (levels, notes, colors, headings)
- Viewing list structures and content
- Editing, moving, and organizing items
- Checking/unchecking and deleting items

Always be helpful and efficient in managing the user's Dynalist content.`;

export interface AgentConfig {
  openaiApiKey: string;
  openaiModel: string;
  dynalistToken: string;
  redisUrl: string;
}

export async function createDynalistAgent(config: AgentConfig) {
  const checkpointer = await RedisSaver.fromUrl(
    config.redisUrl,
    {
      defaultTTL: 60 * 24 * 2, // 2 days
      refreshOnRead: true,
    }
  );

  const dynalistClient = new DynalistClient({ token: config.dynalistToken });
  const dynalistService = new DynalistService(dynalistClient);
  const tools = createDynalistTools(dynalistService);

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      modelName: config.openaiModel,
      openAIApiKey: config.openaiApiKey,
    }),
    tools,
    prompt: SYSTEM_PROMPT,
    checkpointer,
  });

  return agent;
}