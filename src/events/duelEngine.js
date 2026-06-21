import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function safeQuery(queryText, params = []) {
    let client; try { client = await pool.connect(); return await client.query(queryText, params); } 
    catch (e) { console.error(e); return null; } finally { if (client) client.release(); }
}

// Zorgt dat een speler start met 100 credits als hij nog niet in de DB staat
async function geefStandaardCredits(userId) {
    await safeQuery('INSERT INTO partner_credits (user_id, credits) VALUES ($1, 100) ON CONFLICT (user_id) DO NOTHING', [userId]);
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // DATABASE TABELLEN INITIALISEREN
        await safeQuery('CREATE TABLE IF NOT EXISTS partner_credits (user_id TEXT PRIMARY KEY, credits INTEGER DEFAULT 100)');
        await safeQuery('CREATE TABLE IF NOT EXISTS duels (id SERIAL PRIMARY KEY, uitdager TEXT, tegenstander TEXT, inzet INTEGER, uitdager_score INTEGER DEFAULT 0, tegenstander_score INTEGER DEFAULT 0, status TEXT DEFAULT \'PENDING\')');

        // --- COMMANDO: /partner-credits OF !credits ---
        if (message.content === '/partner-credits' || message.content.toLowerCase() === '!credits') {
            await geefStandaardCredits(message.author.id);
            const res = await safeQuery('SELECT credits FROM partner_credits WHERE user_id = $1', [message.author.id]);
            const credits = res?.rows[0]?.credits ?? 100;

            const creditsEmbed = new EmbedBuilder()
                .setTitle('💳 NexSpace Portemonnee')
                .setColor('#00fbff')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setDescription(`Welkom terug, <@${message.author.id}>. Hier zijn je huidige statistieken.`)
                .addFields(
                    { name: '💰 Saldo', value: `\`\`\`🪙 ${credits} Credits\`\`\``, inline: true },
                    { name: '🛡️ Status', value: `\`\`\`💎 Elite Partner\`\`\``, inline: true }
                )
                .setFooter({ text: 'NexSpace Economie Systeem', iconURL: message.guild.iconURL() })
                .setTimestamp();

            return message.reply({ embeds: [creditsEmbed] });
        }

        // --- DUEL UITDAGEN: !partnerduel @user [inzet] ---
        if (message.content.startsWith('!partnerduel')) {
            const args = message.content.split(' ');
            const tegenstander = message.mentions.users.first();
            const inzet = parseInt(args[2]);

            if (!tegenstander || isNaN(inzet) || tegenstander.id === message.author.id) {
                return message.reply('❌ **Gebruik:** `!partnerduel @gebruiker [credits]`');
            }

            await geefStandaardCredits(message.author.id);
            await geefStandaardCredits(tegenstander.id);

            // Check of de uitdager wel genoeg geld heeft
            const saldoCheck = await safeQuery('SELECT credits FROM partner_credits WHERE user_id = $1', [message.author.id]);
            if (saldoCheck.rows[0].credits < inzet) return message.reply('❌ Je hebt zelf niet genoeg credits voor deze inzet!');

            await safeQuery('INSERT INTO duels (uitdager, tegenstander, inzet) VALUES ($1, $2, $3)', [message.author.id, tegenstander.id, inzet]);

            return message.reply(`⚔️ **DUEL UITDAGING!** <@${message.author.id}> daagt <@${tegenstander.id}> uit voor een Partner Duel met een inzet van **${inzet} credits**!\nTyp \`!acceptduel\` om te accepteren.`);
        }

        // --- DUEL ACCEPTEREN ---
        if (message.content === '!acceptduel') {
            const res = await safeQuery('SELECT * FROM duels WHERE tegenstander = $1 AND status = \'PENDING\' ORDER BY id DESC LIMIT 1', [message.author.id]);
            if (!res || res.rows.length === 0) return message.reply('❌ Je hebt geen openstaande uitdagingen.');

            const duel = res.rows[0];
            
            // Check of tegenstander genoeg geld heeft
            const saldoCheck = await safeQuery('SELECT credits FROM partner_credits WHERE user_id = $1', [message.author.id]);
            if (saldoCheck.rows[0].credits < duel.inzet) return message.reply('❌ Je hebt niet genoeg credits om dit duel te accepteren!');

            await safeQuery('UPDATE duels SET status = \'ACTIVE\' WHERE id = $1', [duel.id]);
            return message.reply('⚔️ **Het duel is NU live!** Degene die als eerste `!eindigduel` typt nadat er partners zijn gekoppeld, wint of verliest de pot!');
        }

        // --- PARTNERS TELLEN TIJDENS ACTIEF DUEL ---
        const isPartnerChannel = message.channel.name.toLowerCase().includes('partner') && message.channel.name !== 'partner-log';
        if (isPartnerChannel && message.content.includes('http')) {
            await safeQuery('UPDATE duels SET uitdager_score = uitdager_score + 1 WHERE uitdager = $1 AND status = \'ACTIVE\'', [message.author.id]);
            await safeQuery('UPDATE duels SET tegenstander_score = tegenstander_score + 1 WHERE tegenstander = $1 AND status = \'ACTIVE\'', [message.author.id]);
        }

        // --- DUEL HANDMATIG BEËINDIGEN EN FINANCIËN VERWERKEN ---
        if (message.content === '!eindigduel') {
            const res = await safeQuery('SELECT * FROM duels WHERE (uitdager = $1 OR tegenstander = $2) AND status = \'ACTIVE\' ORDER BY id DESC LIMIT 1', [message.author.id, message.author.id]);
            if (!res || res.rows.length === 0) return message.reply('❌ Je bent niet in een actief duel.');

            const duel = res.rows[0];
            let winnaarId = null;
            let verliezerId = null;

            if (duel.uitdager_score > duel.tegenstander_score) {
                winnaarId = duel.uitdager; verliezerId = duel.tegenstander;
            } else if (duel.tegenstander_score > duel.uitdager_score) {
                winnaarId = duel.tegenstander; verliezerId = duel.uitdager;
            } else {
                await safeQuery('UPDATE duels SET status = \'ENDED\' WHERE id = $1', [duel.id]);
                return message.reply(`🤝 **Gelijkspel!** Beiden hadden \`${duel.uitdager_score}x\` partners gekoppeld. Er worden geen credits afgeschreven.`);
            }

            // GELD VERWERKEN: Trek inzet af van verliezer, geef aan winnaar
            await safeQuery('UPDATE partner_credits SET credits = credits - $1 WHERE user_id = $2', [duel.inzet, verliezerId]);
            await safeQuery('UPDATE partner_credits SET credits = credits + $1 WHERE user_id = $2', [duel.inzet, winnaarId]);
            await safeQuery('UPDATE duels SET status = \'ENDED\' WHERE id = $1', [duel.id]);

            const winEmbed = new EmbedBuilder()
                .setTitle('🏆 DUEL BESLIST!')
                .setColor('#00ff44')
                .setDescription(`<@${winnaarId}> heeft het duel gewonnen met **${Math.max(duel.uitdager_score, duel.tegenstander_score)}** tegen **${Math.min(duel.uitdager_score, duel.tegenstander_score)}** partners!`)
                .addFields(
                    { name: '💰 Economie Update', value: `<@${winnaarId}> wint **+${duel.inzet} credits**\n<@${verliezerId}> verliest **-${duel.inzet} credits**` }
                )
                .setTimestamp();

            return message.reply({ embeds: [winEmbed] });
        }
    }
};
