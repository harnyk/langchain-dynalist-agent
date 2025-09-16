import { config } from 'dotenv';

import { HumanMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { fail } from 'node:assert';

import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { createClient } from 'redis';
import { DynalistClient, DynalistService } from '@harnyk/dynalist-api';
import { createDynalistTools } from './dynalist-tools.js';

config();


const SYSTEM_PROMPT = `You are a Dynalist assistant that helps users manage their lists and documents efficiently.
You can create lists, add items hierarchically, organize content, check/uncheck items, and perform various list management operations.

You have access to comprehensive Dynalist tools to help users with:
- Creating and managing lists
- Adding items with hierarchy (levels, notes, colors, headings)
- Viewing list structures and content
- Editing, moving, and organizing items
- Checking/unchecking and deleting items

Always be helpful and efficient in managing the user's Dynalist content.`;

async function main() {
    const question = process.argv[2] || fail('Please provide a question');
    const model = process.env.OPENAI_MODEL || fail('OPENAI_MODEL is required');
    const apiKey =
        process.env.OPENAI_API_KEY || fail('OPENAI_API_KEY is required');
    const dynalistToken = process.env.DYNALIST_TOKEN || fail('DYNALIST_TOKEN is required');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = createClient({ url: redisUrl });
    try {
        await redis.connect();

        const checkpointer = await RedisSaver.fromUrl(
            redisUrl,
            {
                defaultTTL: 60 * 24 * 2, // 2 days
                refreshOnRead: true,
            }
        );

        const dynalistClient = new DynalistClient({ token: dynalistToken });
        const dynalistService = new DynalistService(dynalistClient);
        const tools = createDynalistTools(dynalistService);

        const agent = createReactAgent({
            llm: new ChatOpenAI({
                modelName: model,
                openAIApiKey: apiKey,
            }),
            tools,
            prompt: SYSTEM_PROMPT,
            checkpointer,
        });

        const result = await agent.invoke(
            {
                messages: [new HumanMessage(question)],
            },
            {
                configurable: { thread_id: 'demo-thread-1' },
            }
        );

        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage) {
            console.log(lastMessage.content);
        } else {
            console.log('No response received');
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await redis.disconnect();
        process.exit(0);
    }
}

main().catch(console.error);
