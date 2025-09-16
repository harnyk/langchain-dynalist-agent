import 'reflect-metadata';
import { Container } from 'inversify';
import { Redis } from 'ioredis';
import { TYPES } from './types.js';

// Repositories
import { IUserRepository } from '../repositories/IUserRepository.js';
import { RedisUserRepository } from '../repositories/RedisUserRepository.js';

// Services
import { ITelegramService } from '../services/ITelegramService.js';
import { TelegramService } from '../services/TelegramService.js';
import { IAgentService } from '../services/IAgentService.js';
import { AgentService } from '../services/AgentService.js';
import { IMemoryService } from '../services/IMemoryService.js';
import { DynalistMemoryService } from '../services/DynalistMemoryService.js';

// Application
import { CommandHandler } from '../application/CommandHandler.js';
import { TelegramBot } from '../application/TelegramBot.js';

const container = new Container();

// Infrastructure
container.bind<Redis>(TYPES.RedisClient).toDynamicValue(() => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl);
}).inSingletonScope();

// Repositories
container.bind<IUserRepository>(TYPES.UserRepository).to(RedisUserRepository).inSingletonScope();

// Services
container.bind<ITelegramService>(TYPES.TelegramService).to(TelegramService).inSingletonScope();
container.bind<IAgentService>(TYPES.AgentService).to(AgentService).inSingletonScope();
container.bind<IMemoryService>(TYPES.MemoryService).to(DynalistMemoryService).inSingletonScope();

// Application
container.bind<CommandHandler>(TYPES.CommandHandler).to(CommandHandler).inSingletonScope();
container.bind<TelegramBot>(TYPES.TelegramBot).to(TelegramBot).inSingletonScope();

export { container };