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

const calculatorTool = tool(
    async (input: unknown) => {
        const { expression } = input as { expression: string };
        try {
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = eval(sanitized);
            return `The result of ${expression} is ${result}`;
        } catch (error) {
            return `Error calculating ${expression}: Invalid expression`;
        }
    },
    {
        name: 'calculator',
        description:
            'Perform basic mathematical calculations. Input should be a mathematical expression like "2+2" or "10*5".',
        schema: z.object({
            expression: z
                .string()
                .describe('The mathematical expression to evaluate'),
        }),
    }
);

const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions accurately and concisely. 
You think through problems step by step and provide clear, well-reasoned responses.
Always be honest about what you know and don't know.

You have access to tools. When you need to perform calculations, use the calculator tool.`;

async function main() {
    const question = process.argv[2] || fail('Please provide a question');
    const model = process.env.OPENAI_MODEL || fail('OPENAI_MODEL is required');
    const apiKey =
        process.env.OPENAI_API_KEY || fail('OPENAI_API_KEY is required');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = createClient({ url: redisUrl });
    try {
        await redis.connect();

        const checkpointer = await RedisSaver.fromUrl(
            'redis://localhost:6379',
            {
                defaultTTL: 60 * 24 * 2, // 2 days
                refreshOnRead: true,
            }
        );

        const agent = createReactAgent({
            llm: new ChatOpenAI({
                modelName: model,
                openAIApiKey: apiKey,
            }),
            tools: [calculatorTool],
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
