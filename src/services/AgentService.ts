import { injectable, inject } from 'inversify';
import { HumanMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { DynalistClient, DynalistService } from '@harnyk/dynalist-api';
import { createDynalistTools } from '../dynalist-tools.js';
import { IAgentService } from './IAgentService.js';
import type { IMemoryService } from './IMemoryService.js';
import { TYPES } from '../container/types.js';
import { getPackageVersion } from '../utils/version.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@injectable()
export class AgentService implements IAgentService {
  private readonly openaiApiKey: string;
  private readonly openaiModel: string;
  private readonly redisUrl: string;

  constructor(
    @inject(TYPES.MemoryService) private memoryService: IMemoryService
  ) {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.openaiModel = process.env.MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  async processMessage(chatId: number, message: string, dynalistToken?: string): Promise<string> {
    try {
      // Build dynamic system prompt with memory and version
      const systemPrompt = await this.buildSystemPrompt(dynalistToken);

      // Create agent with dynamic prompt
      const agent = await this.createAgent(dynalistToken, systemPrompt);

      // Process message with thread ID based on chat ID
      const result = await agent.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        {
          configurable: { thread_id: `chat_${chatId}` },
        }
      );

      // Extract response from last message
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage) {
        return typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      } else {
        return 'No response received from the agent.';
      }
    } catch (error) {
      console.error('Agent processing error:', error);

      if (error instanceof Error) {
        // If it's a Dynalist API error with detailed formatting, return it directly
        if (error.message.includes('❌ **Dynalist Error**')) {
          return error.message;
        }

        // For other errors, provide a more helpful message
        return `❌ **Processing Error**\n\n**Details**: ${error.message}\n\nPlease try again or check your command format.`;
      }

      return 'Sorry, I encountered an unexpected error processing your message. Please try again.';
    }
  }

  async clearHistory(chatId: number): Promise<boolean> {
    try {
      // Note: LangGraph checkpointer doesn't provide a direct clear method
      // This is a limitation we acknowledge
      console.log(`Clear history requested for chat ${chatId} - checkpointer doesn't support direct clearing`);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  private async buildSystemPrompt(dynalistToken?: string): Promise<string> {
    try {
      // Load the base prompt template
      const promptPath = join(__dirname, '../../prompts/dynalist-system.md');
      const promptTemplate = readFileSync(promptPath, 'utf-8');

      // Get current date
      const currentDate = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString();

      // Get package version
      const agentVersion = getPackageVersion();

      // Get memory information if token is available
      let memoryListId = 'ERROR_NO_TOKEN';
      let memoryContent = 'No Dynalist token provided. Please set your token with /token command.';

      if (dynalistToken) {
        try {
          const memoryInfo = await this.memoryService.getOrCreateMemory(dynalistToken);
          memoryListId = memoryInfo.listId;
          memoryContent = memoryInfo.content || 'No memory items stored yet.';
        } catch (error) {
          console.error('Error loading memory:', error);
          memoryListId = 'ERROR_LOADING_MEMORY';
          memoryContent = 'Error: Could not load memory system. Please check your Dynalist token.';
        }
      }

      // Replace placeholders with actual values
      const finalPrompt = promptTemplate
        .replace('{{AGENT_VERSION}}', agentVersion)
        .replace('{{CURRENT_DATE}}', currentDate)
        .replace('{{MEMORY_LIST_ID}}', memoryListId)
        .replace('{{MEMORY_CONTENT}}', memoryContent);

      return finalPrompt;

    } catch (error) {
      console.error('Error building system prompt:', error);
      // Fallback to basic prompt if template loading fails
      return `You are Dyna, a Dynalist assistant that helps users manage their lists and documents efficiently.
Agent Version: ${getPackageVersion()}
Current Date: ${new Date().toISOString().split('T')[0]}

You have access to comprehensive Dynalist tools to help users with:
- Creating and managing lists
- Adding items with hierarchy (levels, notes, colors, headings)
- Viewing list structures and content
- Editing, moving, and organizing items
- Checking/unchecking and deleting items

Always be helpful and efficient in managing the user's Dynalist content.`;
    }
  }

  private async createAgent(dynalistToken?: string, systemPrompt?: string) {
    const checkpointer = await RedisSaver.fromUrl(
      this.redisUrl,
      {
        defaultTTL: 60 * 24 * 2, // 2 days
        refreshOnRead: true,
      }
    );

    // Create tools - use empty token if not provided
    const dynalistClient = new DynalistClient({ token: dynalistToken || '' });
    const dynalistService = new DynalistService(dynalistClient);
    const tools = createDynalistTools(dynalistService);

    const agent = createReactAgent({
      llm: new ChatOpenAI({
        modelName: this.openaiModel,
        openAIApiKey: this.openaiApiKey,
      }),
      tools,
      prompt: systemPrompt || 'You are a helpful assistant.',
      checkpointer,
    });

    return agent;
  }
}