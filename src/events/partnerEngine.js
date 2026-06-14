import { EmbedBuilder, Events, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// Foutopvang voor de database pool zodat je bot niet crasht bij netwerkdipjes
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Functie om het leaderboard te genereren en te updaten
async function updateLeaderboard(guild) {
    try {
        // Tabellen aanmaken als ze nog niet bestaan
        await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
        await pool.query('CREATE TABLE IF NOT EXISTS partner_config (id INTEGER PRIMARY KEY, last_msg_id TEXT)');

        const res = await pool.query('SELECT user_id, count FROM partners WHERE count > 0 ORDER BY count DESC LIMIT 10');
        const logChannel = guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logChannel) return;

        // Statistieken berekenen voor de extra gadgets in de embed
        const totalPartnersRes = await pool.query('SELECT SUM(count) as total FROM partners');
        const totalTopPartnersRes = await pool.query('SELECT COUNT(user_id) as total_users FROM partners WHERE count > 0');
        
        const totalPartners = totalPartnersRes.rows[0].total || 0;
        const totalUsers = totalTopPartnersRes.rows[0].total_users || 0;
        const serverOmzet = totalPartners; // Omdat 1 partner = €1

        const embed = new EmbedBuilder()
            .setTitle('💎 NexSpace Elite Partners')
            .setColor('#00fbff')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setImage('https://i.imgur.com/your-banner-here.png') // Optioneel: Voeg hier een mooie banner URL toe
            .setTimestamp()
            .setFooter({ text: 'NexSpace Automation • Automatische Update', iconURL: guild.iconURL() });

        let list = "";
        if (res.rows.length === 0) {
            list = "*Geen actieve partner data beschikbaar op dit moment.*";
        } else {
            const medals = ['👑', '🥈', '🥉'];
            res.rows.forEach((row, i) => {
                const medal = medals[i] || '🔹';
                // Mooie uitlijning met codeblocks voor de cijfers
                list += `${medal} **Rank #${i + 1}** • <@${row.user_id}>\n┗ 📊 \`${row.count}x\` partners gekoppeld • ( Waarde: \`€${row.count},-\` )\n\n`;
            });
        }

        // Velden toevoegen met statistieken (Gadgets)
        embed.addFields(
            { name: '📈 Totaal Behaald', value: `\`\`\`🏆 ${totalPartners} Partners\`\`\``, inline: true },
            { name: '👥 Actieve Elite Partners', value: `\`\`\`🤝 ${totalUsers} Leden\`\`\``, inline: true },
            { name: '💰 Totale Waarde', value: `\`\`\`💶 €${serverOmzet}.00\`\`\``, inline: true },
            { name: '🏆 Top 10 Ranglijst', value: list }
        );

        // Knoppen toevoegen onder de embed voor Admin beheer
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

        if (configRes.rows.length > 0) {
            try {
                const lastMsg = await logChannel.messages.fetch(configRes.rows[0].last_msg_id);
                await lastMsg.edit({ embeds: [embed], components: [row] });
            } catch (err) {
                // Als het bericht handmatig is verwijderd, stuur een nieuwe
                const newMsg = await logChannel.send({ embeds: [embed], components: [row] });
                await pool.query('UPDATE partner_config SET last_msg_id = $1 WHERE id = 1', [newMsg.id]);
            }
        } else {
            const newMsg = await logChannel.send({ embeds: [embed], components: [row] });
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
        if (message.channel.name === '┃🤝🏻・partners' && message.content.includes('http')) {
            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [message.author.id]);
                await message.react('💎');
                
                await updateLeaderboard(message.guild);
            } catch (e) { console.error(e); }
        }

        // --- 2. HANDMATIGE UPDATE (!partners) ---
        if (message.content.toLowerCase() === '!partners') {
            await updateLeaderboard(message.guild);
            if (message.channel.name !== 'partner-log') {
                await message.reply('✅ Het leaderboard in #partner-log is handmatig bijgewerkt!');
            }
        }

        // --- 3. SYNC COMMANDO ---
        if (message.content === '/partner-sync') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const partnerChannel = message.guild.channels.cache.find(c => c.name === '┃🤝🏻・partners');
            if (!partnerChannel) return message.reply('❌ Kan het partnerkanaal niet vinden.');

            const statusMsg = await message.reply('⚙️ Bezig met scannen van de laatste 100 berichten...');
            
            // Zet eerst alle tellers op 0 om opnieuw te synchroniseren
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

        // --- 4. EENMALIG DATUM-FILTER Commando (!04-06-2026) ---
        if (message.content === '!04-06-2026') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Alleen Admins mogen dit filter commando uitvoeren.');
            }

            const partnerChannel = message.guild.channels.cache.find(c => c.name === '┃🤝🏻・partners');
            if (!partnerChannel) return message.reply('❌ Partnerkanaal niet gevonden.');

            const statusMsg = await message.reply('⏳ Bezig met filteren... Alle data vóór **04-06-2026** wordt verwijderd.');

            try {
                // We zetten de database weer op 0 voor de schone start van deze datum
                await pool.query('UPDATE partners SET count = 0');

                // Target timestamp bepalen (4 juni 2026)
                const filterDate = new Date('2026-06-04T00:00:00Z').getTime();

                // Haal berichten op (tot max 100, verhoog indien nodig)
                const messages = await partnerChannel.messages.fetch({ limit: 100 });
                let verwijderdUitKanaal = 0;

                for (const msg of messages.values()) {
                    if (msg.author.bot) continue;

                    if (msg.createdAt.getTime() < filterDate) {
                        // Bericht is van VOOR 4 juni -> Verwijder uit Discord kanaal
                        try {
                            await msg.delete();
                            verwijderdUitKanaal++;
                        } catch (err) { console.error('Kon bericht niet deleten:', err.message); }
                    } else {
                        // Bericht is op of NA 4 juni -> Tel deze WEL mee in het leaderboard
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
};

// --- 5. INTERACTION KOPPELING VOOR DE LEADERBOARD BUTTONS ---
// Dit vangt de knoppen op die onder het leaderboard staan gedrukt
export const handleButtons = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!['partner_refresh', 'partner_reset'].includes(interaction.customId)) return;

        // Check of degene die klikt wel administrator is
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Alleen Administrators mogen dit leaderboard beheren.', ephemeral: true });
        }

        if (interaction.customId === 'partner_refresh') {
            await interaction.deferUpdate();
            await updateLeaderboard(interaction.guild);
        }

        if (interaction.customId === 'partner_reset') {
            // Reset de database counts naar 0
            await pool.query('UPDATE partners SET count = 0');
            await interaction.reply({ content: '🗑️ Het partner leaderboard is volledig gereset naar 0!', ephemeral: true });
            await updateLeaderboard(interaction.guild);
        }
    }
};
