import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ELITE_ROLES = { 1: 'Lvl 1', 5: 'Lvl 5', 10: 'Lvl 10', 15: 'Lvl 15', 20: 'Lvl 20', 30: 'Lvl 30', 50: 'Lvl 50' };

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // 1. TELLEN SYSTEEM
        if (message.channel.name === 'tellen') {
            const input = parseInt(message.content);
            if (!isNaN(input)) {
                try {
                    await pool.query('CREATE TABLE IF NOT EXISTS counting (id INTEGER PRIMARY KEY, count INTEGER, last_user TEXT)');
                    let res = await pool.query('SELECT * FROM counting WHERE id = 1');
                    if (res.rows.length === 0) {
                        await pool.query('INSERT INTO counting (id, count, last_user) VALUES (1, 0, $1)', ['none']);
                        res = { rows: [{ count: 0, last_user: 'none' }] };
                    }
                    const currentCount = res.rows[0].count;
                    if (input === currentCount + 1 && message.author.id !== res.rows[0].last_user) {
                        await pool.query('UPDATE counting SET count = $1, last_user = $2 WHERE id = 1', [input, message.author.id]);
                        await message.react('✅');
                    } else {
                        await pool.query('UPDATE counting SET count = 0, last_user = $1 WHERE id = 1', ['none']);
                        await message.react('❌');
                        message.reply(`❌ Fout! We beginnen weer bij **1**.`);
                    }
                } catch (e) { console.error(e); }
            }
        }

        // 2. LEVEL SYSTEEM (150 woorden)
        try {
            await pool.query('CREATE TABLE IF NOT EXISTS elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            const wordCount = message.content.trim().split(/\s+/).length;
            if (wordCount >= 2) {
                const res = await pool.query(`
                    INSERT INTO elite_levels (user_id, words) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET words = elite_levels.words + $2
                    RETURNING words`, [message.author.id, wordCount]);
                
                const total = res.rows[0].words;
                const level = Math.floor(total / 150);
                const oldLevel = Math.floor((total - wordCount) / 150);

                if (level > oldLevel && level > 0) {
                    const log = message.guild.channels.cache.find(c => c.name === 'level-up');
                    let roleMsg = "";
                    if (ELITE_ROLES[level]) {
                        const role = message.guild.roles.cache.find(r => r.name === ELITE_ROLES[level]);
                        if (role) { await message.member.roles.add(role).catch(() => {}); roleMsg = `\n💎 Elite Rol verdiend: **${role.name}**!`; }
                    }
                    if (log) {
                        const embed = new EmbedBuilder().setTitle('🆙 NEXSPACE LEVEL UP').setColor('#00FFFF')
                            .setDescription(`Gefeliciteerd ${message.author}! Je bent nu **Level ${level}**!${roleMsg}`)
                            .setThumbnail(message.author.displayAvatarURL());
                        log.send({ content: `${message.author}`, embeds: [embed] });
                    }
                }
            }
        } catch (e) { console.error(e); }
    }
};
