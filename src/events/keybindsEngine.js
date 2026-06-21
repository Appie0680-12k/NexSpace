import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 5000
});

async function safeQuery(queryText, params = []) {
    let client; try { client = await pool.connect(); return await client.query(queryText, params); } 
    catch (e) { console.error(e); return null; } finally { if (client) client.release(); }
}

async function renderKeybinds(guild) {
    try {
        await safeQuery('CREATE TABLE IF NOT EXISTS keybinds_config (id INTEGER PRIMARY KEY, msg_id TEXT)');
        
        const keybindsChannel = guild.channels.cache.find(c => c.name === '┃⌨️・keybinds');
        if (!keybindsChannel) return console.log('⚠️ [KEYBINDS]: Kanaal #┃⌨️・keybinds niet gevonden.');

        const embed = new EmbedBuilder()
            .setTitle('⚙️ NexSpace Automation • Commando Overzicht')
            .setColor('#00fbff')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription('Welkom bij de centrale commando-database van NexSpace. Hieronder vind je alle actieve snelkoppelingen en functies binnen de server.')
            .addFields(
                { 
                    name: '💳 ECONOMIE, CREDITS & STREAKS', 
                    value: '🔹 `/partner-credits` • Bekijk je huidige creditsaldo en partnerstatus.\n🔹 `!credits` • Snelkoppeling naar je digitale portemonnee.\n🔹 `!streak` • Bekijk je Chat Streak in #┃💭・kletshoek & je multiplier.' 
                },
                { 
                    name: '⚔️ PARTNER DUELS (1v1)', 
                    value: '🔹 `!partnerduel @user [inzet]` • Daag een lid uit voor een 24-uurs partnerstrijd.\n🔹 `!acceptduel` • Accepteer een openstaande uitdaging.\n🔹 `!duelstatus` • Bekijk live de tussenstand en de potgrootte.\n🔹 `!eindigduel` • Sluit het duel af en verdeel de credit-pot.' 
                },
                { 
                    name: '🔮 SERVER STATISTICS & AI', 
                    value: '🔹 `!wrapped` • Genereer jouw persoonlijke NexSpace Wrapped overzicht.\n🔹 `!sfeer` • Check de huidige gezelligheidscore van #┃💭・kletshoek.' 
                },
                { 
                    name: '👾 EVENTS & SYSTEM GLITCHES', 
                    value: '🔹 `!fixglitch [code]` • Herstel het systeem tijdens een hack en win de debugger-rol.' 
                },
                { 
                    name: '🏪 BLACK MARKET SHOP', 
                    value: '🔹 `!blackmarket` • Open de geheime winkel voor illegale power-ups.' 
                },
                { 
                    name: '🛠️ STAFF COMMANDO\'S (Alleen voor Staff)', 
                    value: '🔸 `/partner-sync` • Forceer een diepe kanaal-sync en herstel de database.\n🔸 `!partners` • Update direct het partner-leaderboard in #partner-log.\n🔸 `!setcredits @user [aantal]` • Wijzig handmatig het saldo van een lid.\n🔸 `!04-06-2026` • Wis oude partnerberichten van vóór deze datum.' 
                }
            )
            .setFooter({ text: 'NexSpace System Control • Wordt automatisch bijgewerkt', iconURL: guild.iconURL() })
            .setTimestamp();

        const configRes = await safeQuery('SELECT msg_id FROM keybinds_config WHERE id = 1');
        let keybindsMsg;

        if (configRes && configRes.rows.length > 0) {
            try {
                keybindsMsg = await keybindsChannel.messages.fetch(configRes.rows[0].msg_id);
                await keybindsMsg.edit({ embeds: [embed] });
            } catch (err) {
                keybindsMsg = await keybindsChannel.send({ embeds: [embed] });
                await safeQuery('UPDATE keybinds_config SET msg_id = $1 WHERE id = 1', [keybindsMsg.id]);
            }
        } else {
            keybindsMsg = await keybindsChannel.send({ embeds: [embed] });
            await safeQuery('INSERT INTO keybinds_config (id, msg_id) VALUES (1, $1)', [keybindsMsg.id]);
        }
        console.log('✅ [KEYBINDS]: Lijst succesvol live bijgewerkt!');
    } catch (e) {
        console.error('Keybinds Engine Error:', e);
    }
}

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Triggert automatisch een update bij het allereerste chatbericht na een bot-restart
        // Of handmatig te forceren door een Admin via !updatekeybinds
        if (message.content === '!updatekeybinds') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            await renderKeybinds(message.guild);
            await message.reply('✅ De commando-lijst in #┃⌨️・keybinds is opnieuw gegenereerd en vastgezet!');
        }
    }
};
