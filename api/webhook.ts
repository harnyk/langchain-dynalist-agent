import 'reflect-metadata';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { container } from '../src/container/container.js';
import { TYPES } from '../src/container/types.js';
import { TelegramBot } from '../src/application/TelegramBot.js';
import { waitUntil } from '@vercel/functions';

interface TelegramUpdate {
    message?: {
        chat: {
            id: number;
        };
        text: string;
        from?: {
            first_name?: string;
        };
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update: TelegramUpdate = req.body;

        // Get TelegramBot instance from container
        const telegramBot = container.get<TelegramBot>(TYPES.TelegramBot);

        // Process the update in the background
        waitUntil(telegramBot.processUpdate(update));

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
