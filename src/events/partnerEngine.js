import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// Functie om het leaderboard te genereren (zodat we dit vaker kunnen aanroepen)
async function updateLeaderboard(guild) {
    try {
        const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
        const logChannel = guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('💎 NexSpace Elite Partners')
            .setDescription('Dit zijn de huidige partner statistieken voor **NexSpace Community**.')
            .setColor('#00fbff')
            .setThumbnail(guild.iconURL())
            .setFooter({ text: 'Automatische Update' })
            .setTimestamp();

        let list = "";
        if (res.rows.length === 0) {
            list = "Geen actieve data beschikbaar.";
        } else {
            const medals = ['👑', '🥈', '🥉'];
            res.rows.forEach((row, i) => {
                const medal = medals[i] || '🔹';
                list += `${medal} <@${row.user_id}> — **${row.count}** partners (€${row.count})\n`;
            });
        }
        embed.setDescription(`Dit zijn de huidige partner statistieken voor **NexSpace Community**.\n\n${list}`);

        // Check of we al een bericht ID hebben opgeslagen om te bewerken
        await pool.query('CREATE TABLE IF NOT EXISTS partner_config (id INTEGER PRIMARY KEY, last_msg_id TEXT)');
        const configRes = await pool.query('SELECT last_msg_id FROM partner_config WHERE id = 1');

        if (configRes.rows.length > 0) {
            try {
                const lastMsg = await logChannel.messages.fetch(configRes.rows[0].last_msg_id);
                await lastMsg.edit({ embeds: [embed] });
            } catch (err) {
                // Als het bericht is verwijderd, stuur een nieuwe
                const newMsg = await logChannel.send({ embeds: [embed] });
                await pool.query('UPDATE partner_config SET last_msg_id = $1 WHERE id = 1', [newMsg.id]);
            }
        } else {
            const newMsg = await logChannel.send({ embeds: [embed] });
            await pool.query('INSERT INTO partner_config (id, last_msg_id) VALUES (1, $1)', [newMsg.id]);
        }
    } catch (e) {
        console.error('Leaderboard Update Error:', e);
    }
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- 1. AUTO-UPDATE BIJ NIEUWE LINK ---
        if (message.channel.name === 'partners' && message.content.includes('http')) {
            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
                await message.react('💎');
                
                // UPDATE HET LEADERBOARD DIRECT
                await updateLeaderboard(message.guild);
            } catch (e) { console.error(e); }
        }

        // --- 2. HANDMATIGE UPDATE / EERSTE KEER (!partners) ---
        if (message.content.toLowerCase() === '!partners') {
            await updateLeaderboard(message.guild);
            if (message.channel.name !== 'partner-log') {
                await message.reply('✅ Het leaderboard in #partner-log is bijgewerkt!');
            }
        }

        // --- 3. SYNC COMMANDO ---
        if (message.content === '/partner-sync') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const partnerChannel = message.guild.channels.cache.find(c => c.name === 'partners');
            const statusMsg = await message.reply('⚙️ Bezig met scannen...');
            
            const messages = await partnerChannel.messages.fetch({ limit: 100 });
            for (const msg of messages.values()) {
                if (msg.content.includes('http') && !msg.author.bot) {
                    await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                }
            }
            await updateLeaderboard(message.guild);
            return statusMsg.edit('✅ Sync voltooid en leaderboard ververst!');
        }
    }
};
