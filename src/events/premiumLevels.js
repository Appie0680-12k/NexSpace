import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

// We maken de pool één keer buiten de handler aan
let pool;

function getDatabasePool() {
    if (!pool) {
        pool = new pg.Pool({ 
            connectionString: process.env.DATABASE_URL, 
            ssl: { rejectUnauthorized: false },
            max: 10, // Maximaal 10 gelijktijdige verbindingen hergebruiken (voorkomt overbelasting)
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });

        // Vang onverwachte database-fouten op zonder dat de hele Discord bot crasht
        pool.on('error', (err) => {
            console.error('⚠️ [DATABASE-POOL FOUT]: Verbinding onverwacht verbroken.', err.message);
        });
    }
    return pool;
}

// --- DE ROLLEN CONFIGURATIE ---
const levelRoleMap = {
    1: '1501645170045747312',  // Lvl 1 rol
    5: '1501645211745521814',  // Lvl 5 rol
    10: '1501645240933810286', // Lvl 10 rol
    15: '1501645269618528296', // Lvl 15 rol
    20: '1501645306746372127', // Lvl 20 rol
    30: '1501645333560557690', // Lvl 30 rol
    50: '1501645375612784670'  // Lvl 50 rol
};

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // Stop als het een bot is of als het bericht in een DM (sollicitatie) is
        if (message.author.bot || !message.guild) return;

        const db = getDatabasePool();

        // --- 1. ADMIN COMMANDO VOOR VOLLEDIGE RESET ---
        if (message.content.startsWith('/level-reset-all')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            try {
                await db.query('DROP TABLE IF EXISTS premium_levels');
                await db.query('CREATE TABLE IF NOT EXISTS premium_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
                return message.reply('🧹 **Level Systeem:** Alle speler-data is gereset naar Level 0.');
            } catch (e) { 
                console.error('Reset error:', e.message); 
            }
        }

        // --- 2. HET NIVEAU SYSTEEM LOGICA ---
        if (message.content.startsWith('!') || message.content.startsWith('/')) return;

        // Bereken woorden
        const words = message.content.trim().split(/\s+/).length;
        if (words < 2) return;

        try {
            // Controleer of de verbinding stabiel is voor we een query schieten
            await db.query('CREATE TABLE IF NOT EXISTS premium_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            
            // Update de woorden voor de gebruiker
            const res = await db.query(
                'INSERT INTO premium_levels (user_id, words) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET words = premium_levels.words + $2 RETURNING words', 
                [message.author.id, words]
            );
            
            if (!res.rows[0]) return;
            const currentWords = res.rows[0].words;
            
            // Configuratie: Aantal woorden per level
            const wordsPerLevel = 500; 
            const newLevel = Math.floor(currentWords / wordsPerLevel); 
            const oldLevel = Math.floor((currentWords - words) / wordsPerLevel);

            // Als de gebruiker een level omhoog is gegaan
            if (newLevel > oldLevel && newLevel > 0) {
                
                // Zoek het level-up kanaal
                const logChannel = message.guild.channels.cache.find(c => c.name === 'level-up' || c.name === '┃⭐・level-up');
                
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🎊 NexSpace Level Up!')
                        .setDescription(`**Gefeliciteerd ${message.author}!** \nJe bent nu Level **${newLevel}**!`)
                        .addFields(
                            { name: 'Totaal Woorden', value: `\`${currentWords}\``, inline: true },
                            { name: 'Woorden per Level', value: `\`${wordsPerLevel}\``, inline: true }
                        )
                        .setColor('#f1c40f')
                        .setFooter({ text: 'NexSpace Premium Rewards' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(() => null);
                }

                // Rol toewijzen
                const roleIdToGive = levelRoleMap[newLevel];
                if (roleIdToGive) {
                    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                    if (member) {
                        try {
                            const role = message.guild.roles.cache.get(roleIdToGive);
                            if (role) {
                                await member.roles.add(role);
                                if (logChannel) {
                                    await logChannel.send(`🛡️ **Rollen Update:** ${message.author} heeft de rol **${role.name}** ontvangen.`).catch(() => null);
                                }
                            }
                        } catch (e) {
                            console.error(`Fout bij het geven van rol voor Level ${newLevel}:`, e.message);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('⚠️ [LEVEL SYSTEEM NEGEERT EVENT]: Database was bezet of offline. Bericht overgeslagen om crash te voorkomen.');
        }
    }
};
