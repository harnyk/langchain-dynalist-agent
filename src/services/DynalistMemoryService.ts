import { injectable } from 'inversify';
import { DynalistClient, DynalistService } from '@harnyk/dynalist-api';
import { IMemoryService, MemoryInfo } from './IMemoryService.js';

const MEMORY_LIST_NAME = 'AI SYSTEM MEMORY';

@injectable()
export class DynalistMemoryService implements IMemoryService {

  /**
   * Get or create the AI System Memory list and return memory information
   * with hierarchical content reading
   */
  async getOrCreateMemory(dynalistToken: string): Promise<MemoryInfo> {
    try {
      const client = new DynalistClient({ token: dynalistToken });
      const service = new DynalistService(client);

      // First, try to find existing memory list
      const lists = await service.listLists();
      const memoryList = lists.find(list => list.title === MEMORY_LIST_NAME);

      if (memoryList) {
        // Memory list exists, get its hierarchical content
        const content = await this.getMemoryContentHierarchical(service, memoryList.id);
        return {
          listId: memoryList.id,
          content,
          exists: true
        };
      }

      // Memory list doesn't exist, create it
      const newList = await service.createList(MEMORY_LIST_NAME, 'root');

      // Add initial welcome item to the new memory list
      const welcomeText = `Memory initialized on ${new Date().toISOString().split('T')[0]}`;
      await service.addItems(newList.id, [{
        text: welcomeText,
        opts: {
          note: 'This list stores important information about the user across conversations.',
          checkbox: true,
          checked: false
        }
      }]);

      return {
        listId: newList.id,
        content: `- ${welcomeText}\n  > This list stores important information about the user across conversations.`,
        exists: false
      };

    } catch (error) {
      console.error('Error in getOrCreateMemory:', error);
      return {
        listId: '',
        content: 'Error: Could not access memory system. Please check your Dynalist token.',
        exists: false
      };
    }
  }

  /**
   * Get the current content of the memory list formatted as hierarchical text
   * using the tree structure from DynalistService
   */
  private async getMemoryContentHierarchical(service: DynalistService, listId: string): Promise<string> {
    try {
      // Use getItemsWithTree to get full hierarchical structure
      const items = await service.getItemsWithTree(listId);

      if (!items || items.length === 0) {
        return 'No memory items stored yet.';
      }

      // Convert hierarchical structure to formatted text
      return this.formatItemsHierarchical(items, 0);
    } catch (error) {
      console.error('Error reading memory content:', error);
      return 'Error reading memory content.';
    }
  }

  /**
   * Format items hierarchically with proper indentation
   */
  private formatItemsHierarchical(items: any[], depth: number = 0): string {
    const indent = '  '.repeat(depth);
    const formattedItems: string[] = [];

    for (const item of items) {
      let line = `${indent}- ${item.content}`;

      // Add note if present
      if (item.note) {
        line += `\n${indent}  > ${item.note}`;
      }

      // Mark as completed if checked
      if (item.checked) {
        line = `${indent}- ~~${item.content}~~`;
        if (item.note) {
          line += `\n${indent}  > ${item.note}`;
        }
      }

      formattedItems.push(line);

      // Recursively format children if they exist
      if (item.children && item.children.length > 0) {
        const childrenFormatted = this.formatItemsHierarchical(item.children, depth + 1);
        formattedItems.push(childrenFormatted);
      }
    }

    return formattedItems.join('\n');
  }
}