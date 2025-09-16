import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Dynalist Telegram Bot API is running',
    endpoints: {
      webhook: '/api/webhook'
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}