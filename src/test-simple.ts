import { config } from 'dotenv';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { fail } from 'node:assert';
import { z } from 'zod';
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { createClient } from 'redis';

config();

const testTool = tool(
    async (input) => {
        const { message } = input as { message: string };
        return `Echo: ${message}`;
    },
    {
        name: 'echo_tool',
        description: 'Simple echo tool for testing',
        schema: z.object({
            message: z.string().describe('Message to echo back')
        })
    }
);

const SYSTEM_PROMPT = `You are a test assistant. Use the echo_tool to repeat messages back to the user.`;

async function main() {
    const question = process.argv[2] || 'Test message';
    const model = process.env.OPENAI_MODEL || fail('OPENAI_MODEL is required');
    const apiKey = process.env.OPENAI_API_KEY || fail('OPENAI_API_KEY is required');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const redis = createClient({ url: redisUrl });
    try {
        await redis.connect();

        const checkpointer = await RedisSaver.fromUrl(redisUrl, {
            defaultTTL: 60 * 24 * 2,
            refreshOnRead: true,
        });

        const agent = createReactAgent({
            llm: new ChatOpenAI({
                modelName: model,
                openAIApiKey: apiKey,
            }),
            tools: [testTool],
            prompt: SYSTEM_PROMPT,
            checkpointer,
        });

        const result = await agent.invoke(
            {
                messages: [new HumanMessage(question)],
            },
            {
                configurable: { thread_id: 'test-thread-1' },
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