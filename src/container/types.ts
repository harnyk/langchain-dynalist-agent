export const TYPES = {
  // Infrastructure
  RedisClient: Symbol.for('RedisClient'),

  // Repositories
  UserRepository: Symbol.for('UserRepository'),

  // Services
  TelegramService: Symbol.for('TelegramService'),
  AgentService: Symbol.for('AgentService'),
  MemoryService: Symbol.for('MemoryService'),

  // Application
  CommandHandler: Symbol.for('CommandHandler'),
  TelegramBot: Symbol.for('TelegramBot'),
};