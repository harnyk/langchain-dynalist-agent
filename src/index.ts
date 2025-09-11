import { config } from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';

config();

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
      if (Array.isArray(right)) {
        return left.concat(right);
      }
      return left.concat([right]);
    },
    default: () => []
  })
});

const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions accurately and concisely. 
You think through problems step by step and provide clear, well-reasoned responses.
Always be honest about what you know and don't know.`;

async function reasoningAgent(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.7,
  });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages
  ];

  const response = await model.invoke(messages);
  
  return {
    messages: [response]
  };
}

function createReActAgent() {
  const workflow = new StateGraph(StateAnnotation);

  const graph = workflow
    .addNode('agent', reasoningAgent)
    .addEdge('__start__', 'agent')
    .addEdge('agent', '__end__')
    .compile();

  return graph;
}

async function main() {
  const question = process.argv[2];
  
  if (!question) {
    console.error('Please provide a question as an argument');
    console.error('Usage: pnpm dev "What is the capital of France?"');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required');
    console.error('Please create a .env file with your OpenAI API key');
    process.exit(1);
  }

  try {
    const agent = createReActAgent();
    
    const result = await agent.invoke({
      messages: [new HumanMessage(question)]
    });

    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage) {
      console.log(lastMessage.content);
    } else {
      console.log('No response received');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);