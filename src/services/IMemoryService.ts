export interface MemoryInfo {
  listId: string;
  content: string;
  exists: boolean;
}

export interface IMemoryService {
  /**
   * Get or create the AI System Memory list and return memory information
   * with hierarchical content reading
   */
  getOrCreateMemory(dynalistToken: string): Promise<MemoryInfo>;
}