import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import type { IUserRepository } from '../repositories/IUserRepository.js';
import type { ITelegramService } from '../services/ITelegramService.js';
import type { IAgentService } from '../services/IAgentService.js';
import { CommandHandler, TelegramMessage } from './CommandHandler.js';

@injectable()
export class TelegramBot {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.TelegramService) private telegramService: ITelegramService,
    @inject(TYPES.AgentService) private agentService: IAgentService,
    @inject(TYPES.CommandHandler) private commandHandler: CommandHandler
  ) {}

  async processUpdate(update: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!update.message || !update.message.text) {
        return {
          success: true,
          message: 'Non-text message ignored'
        };
      }

      const message: TelegramMessage = update.message;
      const chatId = message.chat.id;

      // Handle command through command handler
      const commandResult = await this.commandHandler.handleCommand(message);

      // Send response if needed
      if (commandResult.shouldSendToUser && commandResult.response) {
        await this.telegramService.sendMessage(chatId, commandResult.response);
      }

      // Delete sensitive message if needed (e.g., token command)
      if (commandResult.shouldDeleteMessage) {
        await this.telegramService.deleteMessage(chatId, message.message_id);
      }

      // If command was handled completely, return
      if (commandResult.shouldSendToUser) {
        return {
          success: commandResult.success,
          message: commandResult.message
        };
      }

      // If we reach here, message needs AI processing
      return await this.processWithAI(chatId, message.text);

    } catch (error) {
      console.error('Bot processing error:', error);
      return {
        success: false,
        message: 'Bot processing error'
      };
    }
  }

  private async processWithAI(chatId: number, text: string): Promise<{ success: boolean; message: string }> {
    let typingInterval: NodeJS.Timeout | null = null;

    try {
      // Set processing flag
      const processingSet = await this.userRepository.setProcessing(chatId);
      if (!processingSet) {
        await this.telegramService.sendMessage(
          chatId,
          '❌ Another request is being processed. Please try again in a moment.'
        );
        return {
          success: false,
          message: 'Processing lock failed'
        };
      }

      // Start typing indicator
      typingInterval = this.telegramService.startTypingIndicator(chatId);

      // Get user's Dynalist token
      const dynalistToken = await this.userRepository.getToken(chatId);

      // Process with agent
      const response = await this.agentService.processMessage(chatId, text, dynalistToken || undefined);

      // Send response
      await this.telegramService.sendMessage(chatId, response);

      return {
        success: true,
        message: 'AI response sent successfully'
      };

    } catch (error) {
      console.error('AI processing error:', error);

      await this.telegramService.sendMessage(
        chatId,
        '❌ Error processing your message. Please try again.'
      );

      return {
        success: false,
        message: 'AI processing error'
      };

    } finally {
      // Clean up
      if (typingInterval) {
        this.telegramService.stopTypingIndicator(typingInterval);
      }
      await this.userRepository.clearProcessing(chatId);
    }
  }
}