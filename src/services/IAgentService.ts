export interface IAgentService {
  /**
   * Process a message with the Dynalist agent
   * @param chatId - Telegram chat ID for thread management
   * @param message - User message to process
   * @param dynalistToken - User's Dynalist API token
   * @returns Agent response
   */
  processMessage(chatId: number, message: string, dynalistToken?: string): Promise<string>;

  /**
   * Clear conversation history for a user
   * Note: This may not clear LangGraph checkpointer history completely
   * depending on the checkpointer implementation
   */
  clearHistory(chatId: number): Promise<boolean>;
}