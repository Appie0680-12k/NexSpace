import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

// We gebruiken een 'Pool', dit is veel stabieler voor Railway
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// De rollen van je foto
const ELITE_ROLES = { 
    1: 'Lvl 1', 
    5: 'Lvl 5', 
    10: 'Lvl 10', 
    15: 'Lvl 15', 
    20: 'Lvl 20', 
    30: 'Lvl 30', 
    50: 'Lvl 50' 
};

export default {
    name: 'messageCreate',
    async execute(message) {
        // Stop als het een bot is of geen server-bericht
        if (message.author.bot || !message.guild) return;

        // --- DEEL A: TELLEN SYSTEEM ---
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
                    const lastUser = res.rows[0].last_user;

                    if (input === currentCount + 1 && message.author.id !== lastUser) {
                        await pool.query('UPDATE counting SET count = $1, last_user = $2 WHERE id = 1', [input, message.author.id]);
                        await message.react('✅');
                    } else {
                        await pool.query('UPDATE counting SET count = 0, last_user = $1 WHERE id = 1', ['none']);
                        await message.react('❌');
                        message.reply(`❌ **Fout!** We beginnen weer bij **1**. Reden: Verkeerd getal of je telde twee keer achter elkaar.`);
                    }
                } catch (err) {
                    console.error('Fout in telsysteem:', err);
                }
            }
        }

        // --- DEEL B: LEVEL SYSTEEM (150 woorden per level) ---
        try {
            // Maak tabel aan als die niet bestaat
            await pool.query('CREATE TABLE IF NOT EXISTS elite_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            
            // Tel woorden in het bericht
            const wordCount = message.content.trim().split(/\s+/).length;
            if (wordCount < 2) return; // Negeer hele korte berichtjes

            // Update database en krijg nieuw totaal
            const res = await pool.query(`
                INSERT INTO elite_levels (user_id, words) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET words = elite_levels.words + $2
                RETURNING words`, [message.author.id, wordCount]);
            
            const totalWords = res.rows[0].words;
            const newLevel = Math.floor(totalWords / 150);
            const oldLevel = Math.floor((totalWords - wordCount) / 150);

            // Check voor Level Up
            if (newLevel > oldLevel && newLevel > 0) {
                const logChannel = message.guild.channels.cache.find(c => c.name === 'level-up');
                let roleInfo = "";

                // Check of dit level een Elite rol krijgt (van je foto)
                if (ELITE_ROLES[newLevel]) {
                    const roleName = ELITE_ROLES[newLevel];
                    const role = message.guild.roles.cache.find(r => r.name === roleName);
                    if (role) {
                        await message.member.roles.add(role).catch(() => {});
                        roleInfo = `\n\n💎 **Elite Status:** Je hebt de rol **${role.name}** gekregen!`;
                    }
                }

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🆙 NEXSPACE ELITE LEVEL UP')
                        .setDescription(`Gefeliciteerd ${message.author}! Je bent gestegen naar **Level ${newLevel}**!${roleInfo}`)
                        .setColor('#00FFFF')
                        .setThumbnail(message.author.displayAvatarURL())
                        .setFooter({ text: '150 woorden per level • NexSpace Elite' })
                        .setTimestamp();

                    await logChannel.send({ content: `${message.author}`, embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Fout in levelsysteem:', err);
        }
    }
};
