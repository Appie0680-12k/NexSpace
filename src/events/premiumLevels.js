import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

// Database verbinding (Zorg dat je DATABASE_URL op Railway goed staat!)
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// --- DE ROLLEN CONFIGURATIE ---
// Pas deze ID's aan naar de werkelijke ID's van de rollen in jouw server!
const levelRoleMap = {
    1: '1501645170045747312', // Pas dit aan naar ID van Lvl 1 rol
    5: '1501645211745521814', // Pas dit aan naar ID van Lvl 5 rol
    10: '1501645240933810286', // Pas dit aan naar ID van Lvl 10 rol
    15: '1501645269618528296', // Pas dit aan naar ID van Lvl 15 rol
    20: '1501645306746372127', // Pas dit aan naar ID van Lvl 20 rol
    30: '1501645333560557690', // Pas dit aan naar ID van Lvl 30 rol
    50: '1501645375612784670'  // Pas dit aan naar ID van Lvl 50 rol
};

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- 1. ADMIN COMMANDO VOOR VOLLEDIGE RESET ---
        if (message.content.startsWith('/level-reset-all')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            try {
                await pool.query('DROP TABLE IF EXISTS premium_levels');
                await pool.query('CREATE TABLE premium_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
                return message.reply('🧹 **Level Systeem:** Alle speler-data is gereset naar Level 0.');
            } catch (e) { console.error(e); }
        }

        // --- 2. HET NIVEAU SYSTEEM LOGICA ---
        
        // Alleen tellen in tekst-kanalen, niet in commando's
        if (message.content.startsWith('!')) return;

        // Tel de woorden. Een bericht moet minimaal 2 woorden hebben om te tellen.
        const words = message.content.trim().split(/\s+/).length;
        if (words < 2) return;

        try {
            await pool.query('CREATE TABLE IF NOT EXISTS premium_levels (user_id TEXT PRIMARY KEY, words INTEGER DEFAULT 0)');
            
            // Update de woorden voor de gebruiker
            const res = await pool.query('INSERT INTO premium_levels (user_id, words) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET words = premium_levels.words + $2 RETURNING words', [message.author.id, words]);
            
            const currentWords = res.rows[0].words;
            const newLevel = Math.floor(currentWords / 500); // 150 woorden per level
            const oldLevel = Math.floor((currentWords - words) / 500);

            // Als de gebruiker een level omhoog is gegaan
            if (newLevel > oldLevel && newLevel > 0) {
                
                // --- A. MOOIE LOG IN #LEVEL-UP ---
                const logChannel = message.guild.channels.cache.find(c => c.name === 'level-up');
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🎊 NexSpace Level Up!')
                        .setDescription(`**Gefeliciteerd ${message.author}!** \nJe bent nu Level **${newLevel}**!`)
                        .addFields(
                            { name: 'Totaal Woorden', value: `\`${currentWords}\``, inline: true },
                            { name: 'Woorden voor volgend level', value: `\`500\``, inline: true }
                        )
                        .setColor('#f1c40f')
                        .setThumbnail('https://i.imgur.com/your-level-logo.png') // Vervang door een vet level logo
                        .setFooter({ text: 'NexSpace Premium Rewards' })
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });
                }

                // --- B. ROL GEVEN (ALLEEN DE SPECIFIEKE NIVEAUS) ---
                const roleIdToGive = levelRoleMap[newLevel];
                if (roleIdToGive) {
                    const member = await message.guild.members.fetch(message.author.id);
                    if (member) {
                        try {
                            const role = message.guild.roles.cache.get(roleIdToGive);
                            if (role) {
                                await member.roles.add(role);
                                
                                // Extra logje dat de rol is gegeven
                                if (logChannel) {
                                    await logChannel.send(`🛡️ **Rollen Update:** ${message.author} heeft de rol **${role.name}** ontvangen.`);
                                }
                            }
                        } catch (e) {
                            console.error(`Fout bij het geven van rol voor Level ${newLevel}:`, e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Level Systeem Error:', e);
        }
    }
};

