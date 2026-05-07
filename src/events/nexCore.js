import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// De officiële Elite rollen
const ELITE_ROLES = { 
    1: 'Lvl 1', 5: 'Lvl 5', 10: 'Lvl 10', 15: 'Lvl 15', 
    20: 'Lvl 20', 30: 'Lvl 30', 50: 'Lvl 50' 
};

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- 1. HET ELITE LEADERBOARD MENU ---
        if (message.content.toLowerCase() === '!elite' || message.content.toLowerCase() === '!elite leaderboard') {
            try {
                const res = await pool.query('SELECT user_id, words FROM elite_levels ORDER BY words DESC LIMIT 10');
                
                const embed = new EmbedBuilder()
                    .setTitle('🏆 NEXSPACE ELITE LEADERBOARD')
                    .setDescription('Wie zijn de meest actieve leden van NexSpace?')
                    .setColor('#00FFFF')
                    .setThumbnail(message.guild.iconURL())
                    .setTimestamp();

                if (res.rows.length === 0) {
                    embed.addFields({ name: 'Status', value: 'Nog geen data. Begin met typen om het klassement te vullen!' });
                } else {
                    let list = "";
                    for (let i = 0; i < res.rows.length; i++) {
                        const level = Math.floor(res.rows[i].words / 150);
                        list += `**${i + 1}.** <@${res.rows[i].user_id}> • **Lvl ${level}** (${res.rows[i].words} woorden)\n`;
                    }
                    embed.addFields({ name: 'Top 10 Gebruikers', value: list });
                }

                return message.reply({ embeds: [embed] });
            } catch (e) {
                console.error(e);
                return message.reply('❌ Kon het Elite systeem niet laden.');
            }
        }

        // --- 2. PARTNER LEADERBOARD SYSTEEM ---
        if (message.content.toLowerCase() === '!partners') {
            try {
                const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
                const embed = new EmbedBuilder()
                    .setTitle('🤝 PARTNER LEADERBOARD')
                    .setColor('#FF00FF')
                    .setThumbnail(message.guild.iconURL());

                if (res.rows.length === 0) {
                    embed.setDescription('Er zijn nog geen partners binnengehaald.');
                } else {
                    const list = res.rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.count}** partners`).join('\n');
                    embed.setDescription(list);
                }
                return message.reply({ embeds: [embed] });
            } catch (e) { console.error(e); }
        }

        // --- 3. HET AUTOMATISCHE XP & LEVEL SYSTEEM ---
        try {
            await pool.query('CREATE TABLE IF NOT EXISTS elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            
            const words = message.content.trim().split(/\s+/).length;
            if (words >= 2) {
                const res = await pool.query(`
                    INSERT INTO elite_levels (user_id, words) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET words = elite_levels.words + $2
                    RETURNING words`, [message.author.id, words]);

                const total = res.rows[0].words;
                const level = Math.floor(total / 150);
                const oldLevel = Math.floor((total - words) / 150);

                if (level > oldLevel && level > 0) {
                    const log = message.guild.channels.cache.find(c => c.name === 'level-up');
                    let roleInfo = "";

                    if (ELITE_ROLES[level]) {
                        const role = message.guild.roles.cache.find(r => r.name === ELITE_ROLES[level]);
                        if (role) {
                            await message.member.roles.add(role).catch(() => {});
                            roleInfo = `\n💎 Je hebt de rol **${role.name}** verdiend!`;
                        }
                    }

                    if (log) {
                        const embed = new EmbedBuilder()
                            .setTitle('🆙 ELITE LEVEL UP')
                            .setDescription(`Gefeliciteerd ${message.author}! Je bent nu **Level ${level}**!${roleInfo}`)
                            .setColor('#00FFFF')
                            .setThumbnail(message.author.displayAvatarURL());
                        log.send({ content: `${message.author}`, embeds: [embed] });
                    }
                }
            }
        } catch (e) { console.error(e); }

        // --- 4. TELLEN SYSTEEM ---
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
    }
};
