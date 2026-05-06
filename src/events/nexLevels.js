import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const { Client } = pg;

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Admin Reset
        if (message.content === '!nex level-reset') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
            await db.connect();
            await db.query('DROP TABLE IF EXISTS elite_levels');
            await db.query('CREATE TABLE elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            await db.end();
            return message.reply('🧹 Systeem gereset.');
        }

        const words = message.content.trim().split(/\s+/).length;
        if (words < 2) return;

        const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        
        try {
            await db.connect();
            await db.query('CREATE TABLE IF NOT EXISTS elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            
            const res = await db.query(`
                INSERT INTO elite_levels (user_id, words) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET words = elite_levels.words + $2
                RETURNING words`, [message.author.id, words]);

            const total = res.rows[0].words;
            const level = Math.floor(total / 150);
            const oldLevel = Math.floor((total - words) / 150);

            if (level > oldLevel && level > 0) {
                const chan = message.guild.channels.cache.find(c => c.name === 'level-up');
                if (chan) {
                    const embed = new EmbedBuilder()
                        .setTitle('🆙 Level Up!')
                        .setDescription(`Gefeliciteerd ${message.author}! Je bent nu **Level ${level}**!`)
                        .setColor('#00FFFF');
                    await chan.send({ content: `${message.author}`, embeds: [embed] });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            await db.end().catch(() => {});
        }
    }
};
