export interface IUserRepository {
  /**
   * Save Dynalist API token for a user
   */
  saveToken(chatId: number, token: string): Promise<boolean>;

  /**
   * Get Dynalist API token for a user
   */
  getToken(chatId: number): Promise<string | null>;

  /**
   * Set processing flag to prevent concurrent requests
   * Returns true if flag was set, false if already processing
   */
  setProcessing(chatId: number): Promise<boolean>;

  /**
   * Check if user is currently being processed
   */
  isProcessing(chatId: number): Promise<boolean>;

  /**
   * Clear processing flag
   */
  clearProcessing(chatId: number): Promise<boolean>;

  /**
   * Clear all user data including history and tokens
   */
  clearUserData(chatId: number): Promise<boolean>;

  /**
   * Clear only thread ID (conversation history) but preserve token
   */
  clearThreadId(chatId: number): Promise<boolean>;
}