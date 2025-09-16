import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import type { IUserRepository } from '../repositories/IUserRepository.js';

export interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
  };
  text: string;
  from?: {
    first_name?: string;
  };
}

export interface CommandResult {
  success: boolean;
  message: string;
  response?: string;
  shouldSendToUser?: boolean;
  shouldDeleteMessage?: boolean;
}

@injectable()
export class CommandHandler {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository
  ) {}

  async handleCommand(message: TelegramMessage): Promise<CommandResult> {
    const { chat, text, from } = message;
    const chatId = chat.id;

    // Handle special commands (these bypass processing lock)
    if (text === '/clear' || text === '/reset') {
      await this.userRepository.clearThreadId(chatId);
      return {
        success: true,
        message: 'History cleared',
        response: '🧹 Chat history cleared! Starting fresh. Your Dynalist token is preserved.',
        shouldSendToUser: true
      };
    }

    if (text.startsWith('/token')) {
      return await this.handleTokenCommand(chatId, text, message.message_id);
    }

    if (text === '/token_status') {
      return await this.handleTokenStatusCommand(chatId);
    }

    if (text === '/start') {
      return this.handleStartCommand(from?.first_name);
    }

    // For non-command messages, check if processing and token status
    const processing = await this.userRepository.isProcessing(chatId);
    if (processing) {
      return {
        success: true,
        message: 'Bot busy message sent',
        response: '⏳ I\'m still working on your previous request. Please wait a moment...',
        shouldSendToUser: true
      };
    }

    const currentToken = await this.userRepository.getToken(chatId);
    if (!currentToken) {
      return {
        success: true,
        message: 'Unauthorized message sent',
        response: '🔒 **Access Required**\n\nDyna is currently in beta testing. You need proper access credentials to use this bot.',
        shouldSendToUser: true
      };
    }

    // Message is ready for AI processing
    return {
      success: true,
      message: 'Ready for AI processing',
      shouldSendToUser: false
    };
  }

  private async handleTokenCommand(chatId: number, text: string, _messageId: number): Promise<CommandResult> {
    const token = text.substring(7).trim();
    if (!token) {
      return {
        success: false,
        message: 'No token provided',
        response: '❌ Please provide a token: `/token YOUR_TOKEN`',
        shouldSendToUser: true
      };
    }

    const saved = await this.userRepository.saveToken(chatId, token);
    if (saved) {
      return {
        success: true,
        message: 'Token saved',
        response: '✅ Access credentials saved successfully! You can now use Dyna to manage your lists.',
        shouldSendToUser: true,
        shouldDeleteMessage: true
      };
    } else {
      return {
        success: false,
        message: 'Token save failed',
        response: '❌ Failed to save token. Please try again.',
        shouldSendToUser: true,
        shouldDeleteMessage: true
      };
    }
  }

  private async handleTokenStatusCommand(chatId: number): Promise<CommandResult> {
    const currentToken = await this.userRepository.getToken(chatId);
    if (currentToken) {
      const maskedToken = currentToken.substring(0, 8) + '...' + currentToken.substring(currentToken.length - 4);
      return {
        success: true,
        message: 'Token status checked',
        response: `✅ Access credentials active: \`${maskedToken}\`\n\nYou can use Dyna commands like:\n• "Create a shopping list called 'Groceries'"\n• "Add milk to my list"\n• "Show my lists"`,
        shouldSendToUser: true
      };
    } else {
      return {
        success: true,
        message: 'Token status checked',
        response: '❌ No access credentials set.',
        shouldSendToUser: true
      };
    }
  }

  private handleStartCommand(firstName?: string): CommandResult {
    const welcomeMsg = `👋 Hi ${firstName || 'there'}! I'm **Dyna**, your AI assistant with Dynalist integration.

🧪 **Beta Version** - Currently in testing phase

I can help with:
• General questions and calculations
• Managing your Dynalist shopping lists
• Creating, editing, and organizing lists

**Commands:**
\`/token_status\` - Check access status
\`/clear\` - Clear chat history

Once you have access, you can say things like:
• "Create a shopping list called 'Groceries'"
• "Add milk and bread to my grocery list"
• "Show all my lists"`;

    return {
      success: true,
      message: 'Welcome sent',
      response: welcomeMsg,
      shouldSendToUser: true
    };
  }
}