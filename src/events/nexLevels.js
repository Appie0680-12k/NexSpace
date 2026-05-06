import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
db.connect();

const ELITE_ROLES = {
    1: 'Lvl 1', 5: 'Lvl 5', 10: 'Lvl 10', 15: 'Lvl 15', 20: 'Lvl 20', 30: 'Lvl 30', 50: 'Lvl 50'
};

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Admin Reset Commando
        if (message.content === '!nex level-reset') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            await db.query('DROP TABLE IF EXISTS elite_levels');
            await db.query('CREATE TABLE elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            return message.reply('🧹 **NexSpace Engine:** Alle levels zijn gereset naar 0!');
        }

        await db.query('CREATE TABLE IF NOT EXISTS elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');

        // Tel woorden
        const wordCount = message.content.trim().split(/\s+/).length;
        if (wordCount < 2) return;

        const res = await db.query(`
            INSERT INTO elite_levels (user_id, words) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET words = elite_levels.words + $2
            RETURNING words`, [message.author.id, wordCount]);

        const totalWords = res.rows[0].words;
        const level = Math.floor(totalWords / 150);
        const oldLevel = Math.floor((totalWords - wordCount) / 150);

        if (level > oldLevel && level > 0) {
            const logChannel = message.guild.channels.cache.find(c => c.name === 'level-up');
            if (!logChannel) return;

            let extra = "";
            if (ELITE_ROLES[level]) {
                const role = message.guild.roles.cache.find(r => r.name === ELITE_ROLES[level]);
                if (role) {
                    await message.member.roles.add(role).catch(() => {});
                    extra = `\n\n💎 **Elite Status:** Je hebt de rol **${role.name}** verdiend!`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🆙 NEXSPACE LEVEL UP')
                .setDescription(`Gefeliciteerd ${message.author}! Je bent nu **Level ${level}**!${extra}`)
                .setColor('#00FFFF')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: '150 woorden per level • NexSpace Elite' });

            await logChannel.send({ content: `${message.author}`, embeds: [embed] });
        }
    }
};
