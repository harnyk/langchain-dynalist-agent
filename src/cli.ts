import { config } from 'dotenv';
import { HumanMessage } from '@langchain/core/messages';
import { createClient } from 'redis';
import { createDynalistAgent, AgentConfig } from './agent.js';
import { fail } from 'node:assert';

config();

export interface CliOptions {
  question: string;
  threadId?: string;
  outputFormat?: 'text' | 'json';
}

export async function runCli(options: CliOptions) {
  const model = process.env.OPENAI_MODEL || fail('OPENAI_MODEL is required');
  const apiKey = process.env.OPENAI_API_KEY || fail('OPENAI_API_KEY is required');
  const dynalistToken = process.env.DYNALIST_TOKEN || fail('DYNALIST_TOKEN is required');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = createClient({ url: redisUrl });

  try {
    await redis.connect();

    const agentConfig: AgentConfig = {
      openaiApiKey: apiKey,
      openaiModel: model,
      dynalistToken,
      redisUrl,
    };

    const agent = await createDynalistAgent(agentConfig);

    const result = await agent.invoke(
      {
        messages: [new HumanMessage(options.question)],
      },
      {
        configurable: { thread_id: options.threadId || 'demo-thread-1' },
      }
    );

    const lastMessage = result.messages[result.messages.length - 1];

    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        success: true,
        response: lastMessage?.content || null,
        threadId: options.threadId || 'demo-thread-1',
      }, null, 2));
    } else {
      if (lastMessage) {
        console.log(lastMessage.content);
      } else {
        console.log('No response received');
      }
    }
  } catch (error) {
    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, null, 2));
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

export function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: dynalist-cli <question> [--thread-id <id>] [--json]');
    console.error('Examples:');
    console.error('  dynalist-cli "Create a shopping list"');
    console.error('  dynalist-cli "List all my documents" --json');
    console.error('  dynalist-cli "Add groceries to my list" --thread-id my-shopping');
    process.exit(1);
  }

  const options: CliOptions = {
    question: '',
    threadId: 'demo-thread-1',
    outputFormat: 'text',
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--thread-id' || arg === '-t') {
      if (i + 1 >= args.length) {
        console.error('Error: --thread-id requires a value');
        process.exit(1);
      }
      options.threadId = args[i + 1];
      i += 2;
    } else if (arg === '--json' || arg === '-j') {
      options.outputFormat = 'json';
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Dynalist CLI - AI assistant for managing Dynalist documents');
      console.log('');
      console.log('Usage: dynalist-cli <question> [options]');
      console.log('');
      console.log('Options:');
      console.log('  -t, --thread-id <id>  Use specific conversation thread (default: demo-thread-1)');
      console.log('  -j, --json           Output response as JSON');
      console.log('  -h, --help           Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  dynalist-cli "Create a shopping list"');
      console.log('  dynalist-cli "List all my documents" --json');
      console.log('  dynalist-cli "Add groceries to my list" --thread-id shopping-session');
      process.exit(0);
    } else {
      if (options.question) {
        options.question += ' ' + arg;
      } else {
        options.question = arg!;
      }
      i += 1;
    }
  }

  if (!options.question.trim()) {
    console.error('Error: Please provide a question');
    process.exit(1);
  }

  return options;
}