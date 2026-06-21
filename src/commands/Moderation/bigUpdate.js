import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('big-update')
        .setDescription('Lanceer de mega NexSpace Automation update met een zieke layout!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            // Zoek het juiste kanaal
            const announcementChannel = guild.channels.cache.find(c => 
                c.name.includes('update') || c.name.includes('announcement') || c.name.includes('changelog')
            );

            if (!announcementChannel) {
                return await interaction.editReply({ content: '❌ Kon geen geschikt update- of aankondigingskanaal vinden.' });
            }

            // ─── EMBED 1: HET GEZICHT ───
            const introEmbed = new EmbedBuilder()
                .setTitle('🚀 MAIN-FRAME UPGRADE: SYSTEM OVERHAUL')
                .setColor('#00fbff')
                .setDescription(
                    `⚡ **ATTENTIE NEXSPACE COMMUNITY** ⚡\n\n` +
                    `Achter de schermen is het mainframe de afgelopen dagen volledig op de schop gegooid. Vanaf **NU** staat er een gigantische server-brede update live die onze economie, interactiviteit en activiteit naar een ongekend niveau tilt!\n\n` +
                    `🤖 *Deze systemen zijn volledig op maat ontworpen, gecodeerd en geïntegreerd door:* **Appie (Klapstoel)** 🔥`
                )
                .setTimestamp();

            // ─── EMBED 2: DE MODULES (Hacker-stijl) ───
            const modulesEmbed = new EmbedBuilder()
                .setTitle('📡 GEACTIVEERDE INJECTIES & MODULES')
                .setColor('#1a1a1a')
                .addFields(
                    { name: '💎 MODULE 01 // PARTNER-SYSTEM v2', value: '```md\n# STATUS: OPTIMALIZED\n* Database-leaks gedicht.\n* Scant 100% accuraat elke link.\n* Waarde: €0,50 per partner.
```' },
                    { name: '💬 MODULE 02 // AI SFEER-METER', value: '```md\n# STATUS: OPERATIONAL\n* Analyseert live de vibe.\n* Sfeer Drops bij 96% hype.\n* Toxic gedrag = sfeer omlaag.```' },
                    { name: '⚔️ MODULE 03 // PARTNER DUELS', value: '```md\n# STATUS: ACTIVE\n* Start met 100 NexSpace Credits.\n* Win credits door te duelleren.\n* 24-uurs competitie modus.
```' },
                    { name: '🏪 MODULE 04 // BLACK MARKET', value: '```md\n# STATUS: ONLINE\n* Koop illegale privileges.\n* Duel Schild: bescherm je wallet.```' },
                    { name: '🔥 MODULE 05 // CHAT STREAKS', value: '```md\n# STATUS: TRACKING\n* Daily kletshoek activiteit.\n* Bouw streak = hogere multipliers.
```' },
                    { name: '👾 MODULE 06 // GLITCH EVENTS', value: '```md\n# STATUS: DANGEROUS\n* 0.5% kans per bericht op hack.\n* Kraak de code, win de Debugger rol.```' },
                    { name: '🔮 MODULE 07 // WRAPPED', value: '```md\n# STATUS: READY\n* Genereer jouw persoonlijke server-statistieken in één oogopslag.
```' }
                )
                .setFooter({ text: 'NexSpace Core Automation • All systems nominal', iconURL: guild.iconURL() });

            await announcementChannel.send({ embeds: [introEmbed, modulesEmbed] });
            await interaction.editReply({ content: '⚡ **MEGA UPDATE GELANCEERD!**' });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Mainframe error tijdens het pushen.' });
        }
    }
};
