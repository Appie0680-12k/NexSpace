import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- 1. RESET COMMANDO ---
        if (message.content === '/reset-partner') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            await pool.query('DROP TABLE IF EXISTS partners');
            await pool.query('CREATE TABLE partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
            return message.reply('🧹 **Partner Engine:** Alles is gereset naar €0.');
        }

        // --- 2. SYNC COMMANDO (Scan verbeterd) ---
        if (message.content === '/partner-sync') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const partnerChannel = message.guild.channels.cache.find(c => c.name === 'partners');
            if (!partnerChannel) return message.reply('❌ Kanaal #partners niet gevonden.');

            const statusMsg = await message.reply('⚙️ Bezig met scannen van alle partners... even geduld.');
            
            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                
                // We halen de laatste 100 berichten op (je kunt dit verhogen naar 500 als je wilt)
                const messages = await partnerChannel.messages.fetch({ limit: 100 });
                let count = 0;

                for (const msg of messages.values()) {
                    if (msg.content.includes('http') && !msg.author.bot) {
                        await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                        count++;
                    }
                }
                return statusMsg.edit(`✅ Sync voltooid! **${count}** partners gevonden en verwerkt.`);
            } catch (err) {
                console.error(err);
                return statusMsg.edit('❌ Er ging iets mis bij de database verbinding.');
            }
        }

        // --- 3. AUTO-UPDATE BIJ NIEUWE LINK ---
        if (message.channel.name === 'partners' && message.content.includes('http')) {
            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
                await message.react('💎');
            } catch (e) { console.error(e); }
        }

        // --- 4. HET LEADERBOARD (!partners) ---
        if (message.content.toLowerCase() === '!partners') {
            try {
                const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
                
                const embed = new EmbedBuilder()
                    .setTitle('💎 NexSpace Elite Partners')
                    .setDescription('Dit zijn de huidige partner statistieken voor **NexSpace Community**.')
                    .setColor('#00fbff') // De lichtblauwe kleur van je foto
                    .setThumbnail(message.guild.iconURL())
                    .setTimestamp();

                if (res.rows.length === 0) {
                    embed.addFields({ name: 'Status', value: 'Geen actieve data beschikbaar.' });
                } else {
                    const medals = ['👑', '🥈', '🥉'];
                    let list = "";

                    res.rows.forEach((row, i) => {
                        const medal = medals[i] || '🔹';
                        list += `${medal} <@${row.user_id}> — **${row.count}** partners (€${row.count})\n`;
                    });
                    embed.setDescription(`Dit zijn de huidige partner statistieken voor **NexSpace Community**.\n\n${list}`);
                }

                // Altijd naar #partner-log sturen
                const logChannel = message.guild.channels.cache.find(c => c.name === 'partner-log');
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                    if (message.channel.id !== logChannel.id) {
                        return message.reply(`✅ Leaderboard geplaatst in ${logChannel}.`);
                    }
                } else {
                    return message.reply({ embeds: [embed] });
                }
            } catch (e) { console.error(e); }
        }
    }
};
