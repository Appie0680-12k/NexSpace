import { EmbedBuilder, Events, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import pg from 'pg';

// Database pool configuratie (Geoptimaliseerd tegen crashes en memory leaks)
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
    console.error('⚠️ [PARTNER DB POOL ERROR]:', err.message);
});

// Functie om het leaderboard te genereren en te updaten
async function updateLeaderboard(guild) {
    try {
        await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
        await pool.query('CREATE TABLE IF NOT EXISTS partner_config (id INTEGER PRIMARY KEY, last_msg_id TEXT)');

        const res = await pool.query('SELECT user_id, count FROM partners WHERE count > 0 ORDER BY count DESC LIMIT 10');
        const logChannel = guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logChannel) return;

        const totalPartnersRes = await pool.query('SELECT SUM(count) as total FROM partners');
        const totalTopPartnersRes = await pool.query('SELECT COUNT(user_id) as total_users FROM partners WHERE count > 0');
        
        const totalPartners = parseInt(totalPartnersRes.rows[0].total) || 0;
        const totalUsers = parseInt(totalTopPartnersRes.rows[0].total_users) || 0;
        
        // --- PRIJSVERLAGING LOGICA: €0,50 per partner ---
        const serverOmzet = (totalPartners * 0.50).toFixed(2); 

        const embed = new EmbedBuilder()
            .setTitle('💎 NexSpace Elite Partners')
            .setColor('#00fbff')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'NexSpace Automation • Automatische Update', iconURL: guild.iconURL() });

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

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('partner_refresh')
                    .setLabel('Verversen')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('partner_reset')
                    .setLabel('Reset Leaderboard')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            );

        const configRes = await pool.query('SELECT last_msg_id FROM partner_config WHERE id = 1');
        let leaderboardMsg;

        if (configRes.rows.length > 0) {
            try {
                leaderboardMsg = await logChannel.messages.fetch(configRes.rows[0].last_msg_id);
                await leaderboardMsg.edit({ embeds: [embed], components: [row] });
            } catch (err) {
                leaderboardMsg = await logChannel.send({ embeds: [embed], components: [row] });
                await pool.query('UPDATE partner_config SET last_msg_id = $1 WHERE id = 1', [leaderboardMsg.id]);
            }
        } else {
            leaderboardMsg = await logChannel.send({ embeds: [embed], components: [row] });
            await pool.query('INSERT INTO partner_config (id, last_msg_id) VALUES (1, $1)', [leaderboardMsg.id]);
        }

    } catch (e) {
        console.error('Leaderboard Update Error:', e);
    }
}

// We exporteren nu een array met twee aparte event-luisteraars zodat alles vlekkeloos blijft werken
export default [
    // --- EVENT 1: BERICHTEN EN COMMANDO'S ---
    {
        name: Events.MessageCreate,
        async execute(message) {
            if (message.author.bot || !message.guild) return;

            // 1. AUTO-UPDATE BIJ NIEUWE LINK
            if (message.channel.name === '┃🤝🏻・partners' && message.content.includes('http')) {
                try {
                    await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                    await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
                    await message.react('💎').catch(() => null);
                    
                    await updateLeaderboard(message.guild);
                } catch (e) { console.error(e); }
            }

            // 2. HANDMATIGE UPDATE (!partners)
            if (message.content.toLowerCase() === '!partners') {
                await updateLeaderboard(message.guild);
                if (message.channel.name !== 'partner-log') {
                    await message.reply('✅ Het leaderboard in #partner-log is handmatig bijgewerkt!');
                }
            }

            // 3. SYNC COMMANDO
            if (message.content === '/partner-sync') {
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
                const partnerChannel = message.guild.channels.cache.find(c => c.name === '┃🤝🏻・partners');
                if (!partnerChannel) return message.reply('❌ Kan het partnerkanaal niet vinden.');

                const statusMsg = await message.reply('⚙️ Bezig met scannen van de laatste 100 berichten...');
                await pool.query('UPDATE partners SET count = 0');

                const messages = await partnerChannel.messages.fetch({ limit: 100 });
                for (const msg of messages.values()) {
                    if (msg.content.includes('http') && !msg.author.bot) {
                        await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                    }
                }
                await updateLeaderboard(message.guild);
                return statusMsg.edit('✅ Volledige sync voltooid en leaderboard ververst!');
            }

            // 4. EENMALIG DATUM-FILTER Commando (!04-06-2026)
            if (message.content === '!04-06-2026') {
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return message.reply('❌ Alleen Admins mogen dit filter commando uitvoeren.');
                }

                const partnerChannel = message.guild.channels.cache.find(c => c.name === '┃🤝🏻・partners');
                if (!partnerChannel) return message.reply('❌ Partnerkanaal niet gevonden.');

                const statusMsg = await message.reply('⏳ Bezig met filteren... Alle data vóór **04-06-2026** wordt verwijderd.');

                try {
                    await pool.query('UPDATE partners SET count = 0');
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
                                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [msg.author.id]);
                            }
                        }
                    }

                    await updateLeaderboard(message.guild);
                    await statusMsg.edit(`✅ **Filter succesvol toegepast!**\n• Berichten van vóór 04-06-2026 zijn uit Discord opgeschoond (${verwijderdUitKanaal} stuks).\n• Het leaderboard telt nu alleen de partners vanaf 4 juni 2026.`);
                } catch (err) {
                    console.error(err);
                    await statusMsg.edit('❌ Er ging iets mis tijdens het filteren.');
                }
            }
        }
    },

    // --- EVENT 2: METEOR-RESISTANT INTERACTION HANDLER (VOOR DE KNOPPEN) ---
    {
        name: Events.InteractionCreate,
        async execute(interaction) {
            // Zorg dat we alleen knoppen opvangen
            if (!interaction.isButton()) return;

            // Filter specifiek op onze partner knoppen
            if (interaction.customId === 'partner_refresh' || interaction.customId === 'partner_reset') {
                
                // Controleer administrator rechten
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ Alleen Administrators mogen dit leaderboard beheren.', ephemeral: true });
                }

                if (interaction.customId === 'partner_refresh') {
                    await interaction.deferUpdate(); // Bevestig de interactie direct naar Discord om mislukkingsmeldingen te voorkomen
                    await updateLeaderboard(interaction.guild);
                }

                if (interaction.customId === 'partner_reset') {
                    await pool.query('UPDATE partners SET count = 0');
                    await interaction.reply({ content: '🗑️ Het partner leaderboard is volledig gereset naar 0!', ephemeral: true });
                    await updateLeaderboard(interaction.guild);
                }
            }
        }
    }
];
