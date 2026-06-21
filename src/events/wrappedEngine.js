import { EmbedBuilder, Events } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function safeQuery(queryText, params = []) {
    let client; try { client = await pool.connect(); return await client.query(queryText, params); } 
    catch (e) { console.error(e); return null; } finally { if (client) client.release(); }
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // MAAK TABEL EN LOG ACTIVITEIT
        await safeQuery('CREATE TABLE IF NOT EXISTS wrapped_stats (user_id TEXT PRIMARY KEY, berichten_count INTEGER DEFAULT 0, favoriet_kanaal TEXT DEFAULT \'Onbekend\')');
        
        // Update berichtenteller van de gebruiker
        await safeQuery('INSERT INTO wrapped_stats (user_id, berichten_count, favoriet_kanaal) VALUES ($1, 1, $2) ON CONFLICT (user_id) DO UPDATE SET berichten_count = wrapped_stats.berichten_count + 1, favoriet_kanaal = $2', [message.author.id, message.channel.name]);

        // COMMANDO OM JOUW WRAPPED OP TE OPRAKEN (!wrapped)
        if (message.content === '!wrapped') {
            const res = await safeQuery('SELECT berichten_count, favoriet_kanaal FROM wrapped_stats WHERE user_id = $1', [message.author.id]);
            const partnerRes = await safeQuery('SELECT count FROM partners WHERE user_id = $1', [message.author.id]);

            if (!res || res.rows.length === 0) return message.reply('❌ Je hebt nog niet genoeg activiteit opgebouwd voor een Wrapped!');

            const stats = res.rows[0];
            const partnerCount = partnerRes?.rows[0]?.count || 0;

            const wrappedEmbed = new EmbedBuilder()
                .setTitle(`🔮 NexSpace Wrapped • ${message.author.username}`)
                .setColor('#aa00ff')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setDescription('Jouw persoonlijke NexSpace voetafdruk van deze periode!')
                .addFields(
                    { name: '💬 Totaal Getypt', value: `\`\`\`${stats.berichten_count} Berichten\`\`\``, inline: true },
                    { name: '💎 Partners Gekoppeld', value: `\`\`\`🏆 ${partnerCount}x\`\`\``, inline: true },
                    { name: '📍 Jouw HQ', value: `\`\`\`# ${stats.favoriet_kanaal}\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'NexSpace Analytics', iconURL: message.guild.iconURL() });

            return message.reply({ embeds: [wrappedEmbed] });
        }
    }
};
