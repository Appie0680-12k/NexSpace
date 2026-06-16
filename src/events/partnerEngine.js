import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

// Database pool configuratie (Geoptimaliseerd met automatische client-release tegen crashes)
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('⚠️ [PARTNER DB POOL ERROR]:', err.message);
});

// Veilige database query helper om database-hangen op Railway te voorkomen
async function safeQuery(queryText, params = []) {
    let client;
    try {
        client = await pool.connect();
        return await client.query(queryText, params);
    } catch (err) {
        console.error('❌ [DATABASE QUERY FAILED]:', err.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// Functie om het leaderboard te genereren en te updaten
async function updateLeaderboard(guild) {
    try {
        await safeQuery('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
        await safeQuery('CREATE TABLE IF NOT EXISTS partner_config (id INTEGER PRIMARY KEY, last_msg_id TEXT)');

        const res = await safeQuery('SELECT user_id, count FROM partners WHERE count > 0 ORDER BY count DESC LIMIT 10');
        
        // Zoek het logkanaal op basis van de naam 'partner-log'
        const logChannel = guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logChannel || !res) return;

        const totalPartnersRes = await safeQuery('SELECT SUM(count) as total FROM partners');
        const totalTopPartnersRes = await safeQuery('SELECT COUNT(user_id) as total_users FROM partners WHERE count > 0');
        
        const totalPartners = totalPartnersRes?.rows[0]?.total ? parseInt(totalPartnersRes.rows[0].total) : 0;
        const totalUsers = totalTopPartnersRes?.rows[0]?.total_users ? parseInt(totalTopPartnersRes.rows[0].total_users) : 0;
        
        // --- PRIJSVERLAGING LOGICA: €0,50 per partner ---
        const serverOmzet = (totalPartners * 0.50).toFixed(2); 

        const embed = new EmbedBuilder()
            .setTitle('💎 NexSpace Elite Partners')
            .setColor('#00fbff')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'NexSpace Automation • Updates via !partners', iconURL: guild.iconURL() });

        let list = "";
        if (res.rows.length === 0) {
            list = "*Geen actieve partner data beschikbaar op dit moment.*";
        } else {
            const medals = ['👑', '🥈', '🥉'];
            res.rows.forEach((row, i) => {
                const medal = medals[i] || '🔹';
                const individueleWaarde = (row.count * 0.50).toFixed(2).replace('.', ',');
                list += `${medal} **Rank #${i + 1}** • <@${row.user_id}>\n┗ 📊 \`${row.count}x\` partners gekoppeld • ( Waarde: \`€${individueleWaarde}\` )\n\n`;
            });
        }

        embed.addFields(
            { name: '📈 Totaal Behaald', value: `\`\`\`🏆 ${totalPartners} Partners\`\`\``, inline: true },
            { name: '👥 Actieve Elite Partners', value: `\`\`\`🤝 ${totalUsers} Leden\`\`\``, inline: true },
            { name: '💰 Totale Waarde', value: `\`\`\`💶 €${serverOmzet.replace('.', ',')}\`\`\``, inline: true },
            { name: '🏆 Top 10 Ranglijst', value: list }
        );

        const configRes = await safeQuery('SELECT last_msg_id FROM partner_config WHERE id = 1');
        let leaderboardMsg;

        // Geen knoppen (components) meer meesturen om conflicten met sollicitaties te vermijden
        if (configRes && configRes.rows.length > 0) {
            try {
                leaderboardMsg = await logChannel.messages.fetch(configRes.rows[0].last_msg_id);
                await leaderboardMsg.edit({ embeds: [embed], components: [] });
            } catch (err) {
                leaderboardMsg = await logChannel.send({ embeds: [embed], components: [] });
                await safeQuery('UPDATE partner_config SET last_msg_id = $1 WHERE id = 1', [leaderboardMsg.id]);
            }
        } else {
            leaderboardMsg = await logChannel.send({ embeds: [embed], components: [] });
            await safeQuery('INSERT INTO partner_config (id, last_msg_id) VALUES (1, $1)', [leaderboardMsg.id]);
        }

    } catch (e) {
        console.error('Leaderboard Update Error:', e);
    }
}

// --- ZUIVERE MESSAGE_CREATE EXPORT ---
export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Dynamische kanaalcheck: herkent elk kanaal waar het woord 'partner' in staat (behalve de log)
        const isPartnerChannel = message.channel.name.toLowerCase().includes('partner') && message.channel.name !== 'partner-log';

        // 1. AUTO-UPDATE BIJ NIEUWE LINK IN PARTNERKANAAL
        if (isPartnerChannel && message.content.includes('http')) {
            await safeQuery('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
            await safeQuery('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
            await message.react('💎').catch(() => null);
            await updateLeaderboard(message.guild);
        }

        // 2. HANDMATIGE UPDATE / VERVERSEN VIA CHAT (!partners)
        if (message.content.toLowerCase() === '!partners') {
            await updateLeaderboard(message.guild);
            if (message.channel.name !== 'partner-log') {
                await message.reply('✅ Het leaderboard in #partner-log is succesvol bijgewerkt op basis van €0,50 per partner!');
            }
        }

        // 3. SYNC COMMANDO VIA CHAT (/partner-sync)
        if (message.content === '/partner-sync') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            
            const partnerChannel = message.guild.channels.cache.find(c => c.name.toLowerCase().includes('partner') && c.name !== 'partner-log');
            if (!partnerChannel) return message.reply('❌ Kan het partnerkanaal niet vinden.');

            const statusMsg = await message.reply('⚙️ Bezig met scannen van de berichten uit het partnerkanaal...');
            await safeQuery('UPDATE partners SET count = 0');

            const messages = await partnerChannel.messages.fetch({ limit: 100 });
            for (const msg of messages.values()) {
                if (msg.content.includes('http') && !msg.author.bot) {
                    await safeQuery('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                }
            }
            await updateLeaderboard(message.guild);
            return statusMsg.edit('✅ Volledige kanaal-sync voltooid en leaderboard live bijgewerkt!');
        }

        // 4. DATUM-FILTER Commando (!04-06-2026)
        if (message.content === '!04-06-2026') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Alleen Admins mogen dit filter commando uitvoeren.');
            }

            const partnerChannel = message.guild.channels.cache.find(c => c.name.toLowerCase().includes('partner') && c.name !== 'partner-log');
            if (!partnerChannel) return message.reply('❌ Partnerkanaal niet gevonden.');

            const statusMsg = await message.reply('⏳ Bezig met filteren... Alle data vóór **04-06-2026** wordt verwijderd.');

            await safeQuery('UPDATE partners SET count = 0');
            const filterDate = new Date('2026-06-04T00:00:00Z').getTime();

            const messages = await partnerChannel.messages.fetch({ limit: 100 });
            let verwijderdUitKanaal = 0;

            for (const msg of messages.values()) {
                if (msg.author.bot) continue;

                if (msg.createdAt.getTime() < filterDate) {
                    try {
                        await msg.delete();
                        verwijderdUitKanaal++;
                    } catch (err) { console.error('Kon bericht niet deleten:', err.message); }
                } else {
                    if (msg.content.includes('http')) {
                        await safeQuery('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                    }
                }
            }

            await updateLeaderboard(message.guild);
            await statusMsg.edit(`✅ **Filter succesvol toegepast!**\n• Berichten van vóór 04-06-2026 zijn opgeschoond (${verwijderdUitKanaal} stuks).\n• Het leaderboard telt nu alleen vanaf 4 juni 2026.`);
        }
    }
};
