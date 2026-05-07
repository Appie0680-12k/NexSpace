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

        // 1. Commando om partner toe te voegen: !addpartner @user
        if (message.content.startsWith('!addpartner')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const target = message.mentions.users.first();
            if (!target) return message.reply('Tag de gebruiker!');

            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [target.id]);
                return message.react('✅');
            } catch (e) { console.error(e); }
        }

        // 2. Het Oude Elite Systeem Menu: !partners
        if (message.content.toLowerCase() === '!partners') {
            try {
                const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
                
                const partnerEmbed = new EmbedBuilder()
                    .setTitle('💎 NexSpace Elite Partners')
                    .setDescription('Dit zijn de huidige partner statistieken voor **NexSpace Community**.')
                    .setColor('#0099ff') // De blauwe kleur van je foto
                    .setThumbnail(message.guild.iconURL());

                if (res.rows.length === 0) {
                    partnerEmbed.addFields({ name: 'Status', value: 'Nog geen partners gevonden.' });
                } else {
                    // Mappen naar de stijl van je foto: Medaille + Naam - Aantal (€ bedrag)
                    const medals = ['👑', '🥈', '🥉'];
                    let leaderText = "";

                    res.rows.forEach((row, index) => {
                        const medal = medals[index] || '🔹';
                        const euro = row.count * 1; // 1 euro per partner zoals op je foto
                        leaderText += `${medal} <@${row.user_id}> — **${row.count}** partners (€${euro})\n`;
                    });

                    partnerEmbed.setDescription(`Dit zijn de huidige partner statistieken voor **NexSpace Community**.\n\n${leaderText}`);
                }

                // De footer en tijd zoals het oude systeem
                partnerEmbed.setFooter({ text: `Gevraagd door ${message.author.username}`, iconURL: message.author.displayAvatarURL() });
                partnerEmbed.setTimestamp();

                return message.reply({ embeds: [partnerEmbed] });
            } catch (e) {
                console.error(e);
            }
        }
    }
};
