import { EmbedBuilder } from 'discord.js';
import pg from 'pg';

// Database verbinding via Railway Variable
const { Client } = pg;
const db = new Client({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Nodig voor externe database verbindingen
});

db.connect().catch(err => console.error('❌ Database verbinding mislukt:', err));

const PARTNER_CHANNEL_NAME = 'partners';
const LOG_CHANNEL_NAME = 'partner-log';
const EURO_PER_PARTNER = 1;

export default [
    {
        name: 'ready',
        once: true,
        async execute(client) {
            // Maak de tabel aan als die nog niet bestaat
            await db.query(`
                CREATE TABLE IF NOT EXISTS partners (
                    user_id TEXT PRIMARY KEY,
                    score INTEGER DEFAULT 0
                )
            `).catch(err => console.error('❌ Fout bij aanmaken tabel:', err));
            
            console.log("✅ Partner database is klaar en verbonden.");
            client.guilds.cache.forEach(guild => updateLeaderboard(guild));
        }
    },
    {
        name: 'messageCreate',
        once: false,
        async execute(message) {
            if (message.author.bot) return;

            // Automatisch loggen van nieuwe berichten
            if (message.channel.name === PARTNER_CHANNEL_NAME) {
                const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(message.content);
                if (hasInvite) {
                    const userId = message.author.id;
                    
                    await db.query(`
                        INSERT INTO partners (user_id, score) 
                        VALUES ($1, 1) 
                        ON CONFLICT (user_id) 
                        DO UPDATE SET score = partners.score + 1
                    `, [userId]);

                    await message.react('💰');
                    await updateLeaderboard(message.guild);
                }
            }
        }
    }
];

// Functie om het leaderboard te tekenen
export async function updateLeaderboard(guild) {
    const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (!logChannel) return;

    const res = await db.query('SELECT * FROM partners ORDER BY score DESC LIMIT 15');
    const rows = res.rows;

    let description = "### 🏆 NexSpace Partner Leaderboard\n" +
                      "Elke partner is **€1,-** waard! 💸\n\n";

    if (rows.length === 0) {
        description += "_Nog geen partners gelogd..._";
    } else {
        rows.forEach((row, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
            description += `${medal} <@${row.user_id}>: **${row.score} partners** (€${row.score * EURO_PER_PARTNER})\n`;
        });
    }

    const leaderboardEmbed = new EmbedBuilder()
        .setDescription(description)
        .setColor('#F1C40F')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'NexSpace Economy • Database Beveiligd 🔒' })
        .setTimestamp();

    const lastMessages = await logChannel.messages.fetch({ limit: 10 });
    const botMsg = lastMessages.find(m => m.author.id === guild.members.me.id);
    
    if (botMsg) {
        await botMsg.edit({ embeds: [leaderboardEmbed] });
    } else {
        await logChannel.send({ embeds: [leaderboardEmbed] });
    }
}

// Functie voor de handmatige /partneradmin update scan
export async function fullChannelScan(guild) {
    const partnerChannel = guild.channels.cache.find(c => c.name === PARTNER_CHANNEL_NAME);
    if (!partnerChannel) throw new Error("Kanaal niet gevonden");

    // Reset database voor schone scan
    await db.query('DELETE FROM partners');

    let lastId;
    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const messages = await partnerChannel.messages.fetch(options);
        if (messages.size === 0) break;

        for (const msg of messages.values()) {
            const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(msg.content);
            if (!msg.author.bot && hasInvite) {
                await db.query(`
                    INSERT INTO partners (user_id, score) 
                    VALUES ($1, 1) 
                    ON CONFLICT (user_id) 
                    DO UPDATE SET score = partners.score + 1
                `, [msg.author.id]);
            }
        }
        lastId = messages.last().id;
        if (messages.size < 100) break;
    }
    await updateLeaderboard(guild);
}
