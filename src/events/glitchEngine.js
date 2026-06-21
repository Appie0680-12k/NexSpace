import { Events, PermissionFlagsBits } from 'discord.js';

let actieveGlitchCode = null;

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // 1. RANDOM TRIGGER LOGICA (0.5% kans bij elk bericht in de server om te activeren)
        if (!actieveGlitchCode && Math.random() < 0.005 && message.channel.name === 'general') {
            const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase(); // Genereert bijv: X9F2A
            actieveGlitchCode = randomCode;

            // Zoek een willekeurig tekstkanaal op de server om het bericht te dumpen
            const randomChannel = message.guild.channels.cache.filter(c => c.isTextBased()).random();

            if (randomChannel) {
                await randomChannel.send(`⚠️ **S-S-SYSTEEM GLITCH DETECTED...** 👾\nDe serverbestanden zijn gecorrumpeerd! Voer de de-encryptie code uit in de chat om het systeem te herstellen:\n\`👉 !fixglitch ${randomCode}\``);
            }
        }

        // 2. OPLOSSING COMMANDO
        if (message.content.startsWith('!fixglitch')) {
            const ingevoerdeCode = message.content.split(' ')[1]?.toUpperCase();

            if (!actieveGlitchCode) return message.reply('❌ Er is momenteel geen actieve systeemglitch aan de gang.');
            
            if (ingevoerdeCode === actieveGlitchCode) {
                actieveGlitchCode = null; // Reset de glitch

                // Geef een speciale tijdelijke rol als beloning
                let glitchRol = message.guild.roles.cache.find(r => r.name === '👾 Server Debugger');
                if (!glitchRol) {
                    glitchRol = await message.guild.roles.create({ name: '👾 Server Debugger', color: '#00ff1a', reason: 'Glitch Event' }).catch(() => null);
                }

                if (glitchRol) {
                    // Haal eerst de rol weg bij eerdere winnaars
                    glitchRol.members.forEach(m => m.roles.remove(glitchRol));
                    // Geef hem aan de nieuwe winnaar
                    await message.member.roles.add(glitchRol).catch(() => null);
                }

                return message.reply(`👑 **SYSTEEM HERSTELD!** <@${message.author.id}> heeft de glitch opgelost en ontvangt de exclusieve **👾 Server Debugger** rol voor de komende 24 uur!`);
            } else {
                return message.reply('❌ Gecorrumpeerde code. De-encryptie mislukt!');
            }
        }
    }
};
