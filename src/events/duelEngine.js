import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000
});

async function safeQuery(queryText, params = []) {
    let client; try { client = await pool.connect(); return await client.query(queryText, params); } 
    catch (e) { console.error(e); return null; } finally { if (client) client.release(); }
}

async function geefStandaardCredits(userId) {
    await safeQuery('INSERT INTO partner_credits (user_id, credits, last_message_date, streak) VALUES ($1, 100, 0, 0) ON CONFLICT (user_id) DO NOTHING', [userId]);
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // INITIALISEER TABELLEN (Inclusief streak & items)
        await safeQuery(`
            CREATE TABLE IF NOT EXISTS partner_credits (
                user_id TEXT PRIMARY KEY, 
                credits INTEGER DEFAULT 100, 
                last_message_date BIGINT DEFAULT 0, 
                streak INTEGER DEFAULT 0,
                has_shield BOOLEAN DEFAULT FALSE
            )
        `);
        await safeQuery('CREATE TABLE IF NOT EXISTS duels (id SERIAL PRIMARY KEY, uitdager TEXT, tegenstander TEXT, inzet INTEGER, uitdager_score INTEGER DEFAULT 0, tegenstander_score INTEGER DEFAULT 0, status TEXT DEFAULT \'PENDING\')');

        const vandaag = new Date().setHours(0,0,0,0);

        // --- AUTOMATISCHE CHAT STREAK LOGICA (#┃💭・kletshoek) ---
        if (message.channel.name === '┃💭・kletshoek') {
            await geefStandaardCredits(message.author.id);
            const userRes = await safeQuery('SELECT last_message_date, streak FROM partner_credits WHERE user_id = $1', [message.author.id]);
            
            if (userRes && userRes.rows.length > 0) {
                const stats = userRes.rows[0];
                const laatsteKeerGetypt = parseInt(stats.last_message_date);
                const gisteren = vandaag - (24 * 60 * 60 * 1000);

                if (laatsteKeerGetypt === gisteren) {
                    // Streak gaat omhoog!
                    await safeQuery('UPDATE partner_credits SET streak = streak + 1, last_message_date = $1 WHERE user_id = $2', [vandaag, message.author.id]);
                } else if (laatsteKeerGetypt < gisteren && laatsteKeerGetypt !== vandaag) {
                    // Te laat, reset naar 1
                    await safeQuery('UPDATE partner_credits SET streak = 1, last_message_date = $1 WHERE user_id = $2', [vandaag, message.author.id]);
                }
            }
        }

        // --- COMMANDO: !streak ---
        if (message.content.toLowerCase() === '!streak') {
            await geefStandaardCredits(message.author.id);
            const res = await safeQuery('SELECT streak FROM partner_credits WHERE user_id = $1', [message.author.id]);
            const streak = res?.rows[0]?.streak ?? 0;
            const multiplier = (1 + (streak * 0.05)).toFixed(2); // Elke dag streak geeft +5% bonus

            return message.reply(`🔥 **Jouw Chat Streak:** \`${streak} dagen\` (Multiplier: \`x${multiplier}\` op daily bonussen!)`);
        }

        // --- COMMANDO: !blackmarket ---
        if (message.content.toLowerCase() === '!blackmarket') {
            await geefStandaardCredits(message.author.id);
            
            const shopEmbed = new EmbedBuilder()
                .setTitle('🏪 De NexSpace Zwarte Markt')
                .setColor('#2f3136')
                .setDescription('Koop illegale server power-ups met je partner-credits!\n\n🛒 **Aanbod:**\n🛡️ **Duel Schild** • \`250 Credits\`\n*Beschermt je tegen creditverlies bij je eerstvolgende verloren duel.*\n\nTyp \`!buy schild\` om dit item aan te schaffen.')
                .setTimestamp();

            return message.reply({ embeds: [shopEmbed] });
        }

        // --- COMMANDO: !buy schild ---
        if (message.content.toLowerCase() === '!buy schild') {
            await geefStandaardCredits(message.author.id);
            const res = await safeQuery('SELECT credits, has_shield FROM partner_credits WHERE user_id = $1', [message.author.id]);
            
            if (res && res.rows[0].credits < 250) return message.reply('❌ Je hebt niet genoeg credits op de Zwarte Markt!');
            if (res && res.rows[0].has_shield) return message.reply('❌ Je hebt al een actief Duel Schild!');

            await safeQuery('UPDATE partner_credits SET credits = credits - 250, has_shield = TRUE WHERE user_id = $1', [message.author.id]);
            return message.reply('🛡️ **Aankoop voltooid!** Je hebt een **Duel Schild** gekocht. Je bent beschermd bij je volgende verlies.');
        }

        // --- COMMANDO: /partner-credits OF !credits ---
        if (message.content === '/partner-credits' || message.content.toLowerCase() === '!credits') {
            await geefStandaardCredits(message.author.id);
            const res = await safeQuery('SELECT credits, has_shield FROM partner_credits WHERE user_id = $1', [message.author.id]);
            const credits = res?.rows[0]?.credits ?? 100;
            const schildStatus = res?.rows[0]?.has_shield ? '🛡️ Actief' : '❌ Geen';

            const creditsEmbed = new EmbedBuilder()
                .setTitle('💳 NexSpace Portemonnee')
                .setColor('#00fbff')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '💰 Saldo', value: `\`\`\`🪙 ${credits} Credits\`\`\``, inline: true },
                    { name: '🛡️ Duel Schild', value: `\`\`\`${schildStatus}\`\`\``, inline: true }
                )
                .setFooter({ text: 'NexSpace Economie' })
                .setTimestamp();

            return message.reply({ embeds: [creditsEmbed] });
        }

        // --- COMMANDO: !partnerduel @user [inzet] ---
        if (message.content.startsWith('!partnerduel')) {
            const args = message.content.split(' ');
            const tegenstander = message.mentions.users.first();
            const inzet = parseInt(args[2]);

            if (!tegenstander || isNaN(inzet) || tegenstander.id === message.author.id) {
                return message.reply('❌ **Gebruik:** `!partnerduel @gebruiker [credits]`');
            }

            await geefStandaardCredits(message.author.id);
            await geefStandaardCredits(tegenstander.id);

            const saldoCheck = await safeQuery('SELECT credits FROM partner_credits WHERE user_id = $1', [message.author.id]);
            if (saldoCheck.rows[0].credits < inzet) return message.reply('❌ Je hebt zelf niet genoeg credits!');

            await safeQuery('INSERT INTO duels (uitdager, tegenstander, inzet) VALUES ($1, $2, $3)', [message.author.id, tegenstander.id, inzet]);
            return message.reply(`⚔️ **DUEL UITDAGING!** <@${message.author.id}> daagt <@${tegenstander.id}> uit voor een duel om **${inzet} credits**! Typ \`!acceptduel\`.`);
        }

        // --- COMMANDO: !acceptduel ---
        if (message.content === '!acceptduel') {
            const res = await safeQuery('SELECT * FROM duels WHERE tegenstander = $1 AND status = \'PENDING\' ORDER BY id DESC LIMIT 1', [message.author.id]);
            if (!res || res.rows.length === 0) return message.reply('❌ Geen openstaande uitdagingen.');

            const duel = res.rows[0];
            const saldoCheck = await safeQuery('SELECT credits FROM partner_credits WHERE user_id = $1', [message.author.id]);
            if (saldoCheck.rows[0].credits < duel.inzet) return message.reply('❌ Je hebt te weinig credits!');

            await safeQuery('UPDATE duels SET status = \'ACTIVE\' WHERE id = $1', [duel.id]);
            return message.reply('⚔️ **Het duel is nu LIVE!** Typ straks \`!eindigduel\` om af te ronden.');
        }

        // --- COMMANDO: !eindigduel ---
        if (message.content === '!eindigduel') {
            const res = await safeQuery('SELECT * FROM duels WHERE (uitdager = $1 OR tegenstander = $2) AND status = \'ACTIVE\' ORDER BY id DESC LIMIT 1', [message.author.id, message.author.id]);
            if (!res || res.rows.length === 0) return message.reply('❌ Je bent niet in een actief duel.');

            const duel = res.rows[0];
            let winnaarId = null; let verliezerId = null;

            if (duel.uitdager_score > duel.tegenstander_score) { winnaarId = duel.uitdager; verliezerId = duel.tegenstander; } 
            else if (duel.tegenstander_score > duel.uitdager_score) { winnaarId = duel.tegenstander; verliezerId = duel.uitdager; } 
            else {
                await safeQuery('UPDATE duels SET status = \'ENDED\' WHERE id = $1', [duel.id]);
                return message.reply('🤝 **Gelijkspel!** Geen creditverlies.');
            }

            // Check op SCHILD bij de verliezer
            const verliezerCheck = await safeQuery('SELECT has_shield FROM partner_credits WHERE user_id = $1', [verliezerId]);
            const heeftSchild = verliezerCheck?.rows[0]?.has_shield ?? false;

            if (heeftSchild) {
                // Verliezer behoudt z'n geld, schild breekt, winnaar krijgt wel gewoon betaald uit de serverkas
                await safeQuery('UPDATE partner_credits SET has_shield = FALSE WHERE user_id = $1', [verliezerId]);
                await safeQuery('UPDATE partner_credits SET credits = credits + $1 WHERE user_id = $2', [duel.inzet, winnaarId]);
                message.channel.send(`🛡️ <@${verliezerId}> verloor, maar zijn **Duel Schild** ving de klap op! Er zijn geen credits afgeschreven.`);
            } else {
                // Normale transactie
                await safeQuery('UPDATE partner_credits SET credits = credits - $1 WHERE user_id = $2', [duel.inzet, verliezerId]);
                await safeQuery('UPDATE partner_credits SET credits = credits + $1 WHERE user_id = $2', [duel.inzet, winnaarId]);
            }

            await safeQuery('UPDATE duels SET status = \'ENDED\' WHERE id = $1', [duel.id]);
            return message.reply(`🏆 <@${winnaarId}> wint het duel en pakt **+${duel.inzet} credits**!`);
        }

        // --- STAFF COMMANDO: !setcredits @user [aantal] ---
        if (message.content.startsWith('!setcredits')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const args = message.content.split(' ');
            const doelwit = message.mentions.users.first();
            const aantal = parseInt(args[2]);

            if (!doelwit || isNaN(aantal)) return message.reply('❌ Gebruik: \`!setcredits @user [aantal]\`');

            await geefStandaardCredits(doelwit.id);
            await safeQuery('UPDATE partner_credits SET credits = $1 WHERE user_id = $2', [aantal, doelwit.id]);
            return message.reply(`✅ Saldo van <@${doelwit.id}> handmatig gewijzigd naar **${aantal} credits**.`);
        }
    }
};
