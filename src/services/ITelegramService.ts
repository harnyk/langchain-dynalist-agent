export interface ITelegramService {
  /**
   * Send text message to Telegram chat
   * @param parseMode Optional parse mode. If not specified, sends as plain text
   */
  sendMessage(chatId: number, text: string, parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'): Promise<boolean>;

  /**
   * Send typing action to show bot is processing
   */
  sendTypingAction(chatId: number): Promise<void>;

  /**
   * Start typing indicator with periodic updates
   * Returns interval ID that can be used to stop
   */
  startTypingIndicator(chatId: number): NodeJS.Timeout;

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(intervalId: NodeJS.Timeout): void;

  /**
   * Delete a message from chat
   */
  deleteMessage(chatId: number, messageId: number): Promise<boolean>;
}