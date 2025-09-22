import { injectable } from 'inversify';
import { ITelegramService } from './ITelegramService.js';

@injectable()
export class TelegramService implements ITelegramService {
  private readonly botToken: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }
  }

  async sendMessage(chatId: number, text: string, parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'): Promise<boolean> {
    try {
      // Log the message being sent
      console.log(`[TELEGRAM] Sending message to chat ${chatId}:`, text);
      console.log(`[TELEGRAM] Parse mode: ${parseMode || 'none (plain text)'}`);

      const requestBody: any = {
        chat_id: chatId,
        text: text
      };

      // Only add parse_mode if explicitly specified, otherwise send as plain text
      if (parseMode) {
        requestBody.parse_mode = parseMode;
      }

      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`[TELEGRAM] Failed to send message. Status: ${response.status}`);
        console.error(`[TELEGRAM] Response:`, responseText);
      } else {
        console.log(`[TELEGRAM] Message sent successfully`);
      }

      return response.ok;
    } catch (error) {
      console.error('[TELEGRAM] Error sending message:', error);
      return false;
    }
  }

  async sendTypingAction(chatId: number): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/sendChatAction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          action: 'typing',
        }),
      });
    } catch (error) {
      console.error('Error sending typing action:', error);
    }
  }

  startTypingIndicator(chatId: number): NodeJS.Timeout {
    // Send initial typing action
    this.sendTypingAction(chatId);

    // Set up periodic typing indicator (Telegram requires it every 5 seconds)
    return setInterval(() => {
      this.sendTypingAction(chatId);
    }, 4000);
  }

  stopTypingIndicator(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }

  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/deleteMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId
        })
      });

      if (!response.ok) {
        console.error('Failed to delete Telegram message:', await response.text());
      }

      return response.ok;
    } catch (error) {
      console.error('Error deleting Telegram message:', error);
      return false;
    }
  }
}