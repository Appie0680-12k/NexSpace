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

        // --- 1. SETUP & RESET COMMAND ---
        if (message.content === '/reset-partner') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            await pool.query('DROP TABLE IF EXISTS partners');
            await pool.query('CREATE TABLE partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
            return message.reply('🧹 **Partner Engine:** Leaderboard volledig gereset naar €0.');
        }

        // --- 2. BACKFILL COMMAND (Eénmalig alles inlezen) ---
        if (message.content === '/partner-sync') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const partnerChannel = message.guild.channels.cache.find(c => c.name === 'partners');
            if (!partnerChannel) return message.reply('❌ Kanaal #partners niet gevonden.');

            await message.reply('⚙️ Bezig met scannen van alle partners... even geduld.');
            
            const messages = await partnerChannel.messages.fetch({ limit: 100 });
            await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');

            for (const msg of messages.values()) {
                if (msg.content.includes('http') && !msg.author.bot) {
                    await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                }
            }
            return message.channel.send('✅ Sync voltooid! Gebruik `!partners` om de nieuwe stand te zien.');
        }

        // --- 3. AUTOMATISCHE SCAN (Nieuwe berichten met links) ---
        if (message.channel.name === 'partners' && message.content.includes('http')) {
            await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
            await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
            await message.react('💎'); // Bevestiging dat het geteld is
        }

        // --- 4. HET VETTE LEADERBOARD COMMAND ---
        if (message.content.toLowerCase() === '!partners' || message.content.toLowerCase() === '/leaderboard') {
            try {
                const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
                
                const embed = new EmbedBuilder()
                    .setTitle('🚀 NexSpace Elite Partners')
                    .setDescription('De officiële statistieken van onze partner-distributeurs.')
                    .setColor('#00fbff')
                    .setThumbnail('https://i.imgur.com/your-logo-link.png') // Vervang door je eigen logo link
                    .setTimestamp();

                if (res.rows.length === 0) {
                    embed.addFields({ name: 'Status', value: 'Geen actieve data beschikbaar na de laatste reset.' });
                } else {
                    let leaderList = "";
                    const icons = ['👑', '🥈', '🥉', '👤', '👤', '👤', '👤', '👤', '👤', '👤'];

                    res.rows.forEach((row, i) => {
                        const totalEuro = row.count * 1; // 1 euro per partner
                        leaderList += `${icons[i]} <@${row.user_id}>\n ╰ **${row.count} Partners** • \`€${totalEuro.toFixed(2)}\`\n\n`;
                    });
                    
                    embed.setDescription(`**Huidige uitbetalingen & ranking:**\n\n${leaderList}`);
                }

                embed.setFooter({ text: 'NexSpace Community • Elke partner telt voor €1.00', iconURL: message.guild.iconURL() });

                // Stuur naar #partner-log als dat bestaat, anders in huidige kanaal
                const logChannel = message.guild.channels.cache.find(c => c.name === 'partner-log');
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                    return message.reply(`✅ Leaderboard is geplaatst in ${logChannel}.`);
                } else {
                    return message.reply({ embeds: [embed] });
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
};
