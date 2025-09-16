import { injectable, inject } from 'inversify';
import type { Redis } from 'ioredis';
import type { IUserRepository } from './IUserRepository.js';
import { TYPES } from '../container/types.js';

@injectable()
export class RedisUserRepository implements IUserRepository {
  constructor(@inject(TYPES.RedisClient) private redis: Redis) {}

  async saveToken(chatId: number, token: string): Promise<boolean> {
    try {
      await this.redis.set(`chat:${chatId}:dynalist_token`, token);
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  }

  async getToken(chatId: number): Promise<string | null> {
    try {
      return await this.redis.get(`chat:${chatId}:dynalist_token`);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setProcessing(chatId: number): Promise<boolean> {
    try {
      // Set processing flag with 3 minute TTL using NX (only if not exists)
      const result = await this.redis.set(
        `chat:${chatId}:processing`,
        '1',
        'EX',
        180,
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      console.error('Error setting processing flag:', error);
      return false;
    }
  }

  async isProcessing(chatId: number): Promise<boolean> {
    try {
      const result = await this.redis.get(`chat:${chatId}:processing`);
      return result === '1';
    } catch (error) {
      console.error('Error checking processing flag:', error);
      return false;
    }
  }

  async clearProcessing(chatId: number): Promise<boolean> {
    try {
      await this.redis.del(`chat:${chatId}:processing`);
      return true;
    } catch (error) {
      console.error('Error clearing processing flag:', error);
      return false;
    }
  }

  async clearUserData(chatId: number): Promise<boolean> {
    try {
      // Clear token and processing flag
      await this.redis.del(
        `chat:${chatId}:dynalist_token`,
        `chat:${chatId}:processing`
      );
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }

  async clearThreadId(chatId: number): Promise<boolean> {
    try {
      // Clear only processing flag, preserve token
      await this.redis.del(`chat:${chatId}:processing`);
      return true;
    } catch (error) {
      console.error('Error clearing thread ID:', error);
      return false;
    }
  }
}