import { EmbedBuilder } from 'discord.js';
import pg from 'pg';

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild || !process.env.DATABASE_URL) return;

        // Als de DATABASE_URL er wel is, voer dan de code uit
        const { Client } = pg;
        const db = new Client({ 
            connectionString: process.env.DATABASE_URL, 
            ssl: { rejectUnauthorized: false } 
        });

        try {
            await db.connect();
            // ... (hier staat de rest van de level code die we eerder hadden)
            await db.end();
        } catch (e) {
            console.error("Database niet bereikbaar, levels werken tijdelijk niet.");
            if (db) await db.end().catch(() => {});
        }
    }
};
