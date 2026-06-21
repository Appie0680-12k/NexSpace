import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('big-update')
        .setDescription('🚀 Lanceer de exclusieve NexSpace Automation Mega-Update met interactive gadgets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, guildConfig, client) {
        // Direct deferren zodat de bot alle tijd heeft en Discord niet blijft laden
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            
            // Zoek automatisch naar het juiste update/changelog kanaal
            const changelogChannel = guild.channels.cache.find(c => 
                c.name.includes('changelog') || c.name.includes('update') || c.name.includes('announcement')
            );

            if (!changelogChannel) {
                return await interaction.editReply({ content: '❌ Kon geen geschikt update- of changelogkanaal vinden.' });
            }

            // ─── GADGET EMBED 1: HET MAINFRAME GEZICHT ───
            const introEmbed = new EmbedBuilder()
                .setTitle('🚀 MAIN-FRAME UPGRADE: SYSTEM OVERHAUL')
                .setColor('#00fbff')
                .setDescription(
                    `⚡ **ATTENTIE NEXSPACE COMMUNITY** ⚡\n\n` +
                    `Achter de schermen is het mainframe volledig op de schop gegooid. Vanaf **NU** staat er een gigantische server-brede update live die onze economie, interactiviteit en activiteit naar een ongekend niveau tilt!\n\n` +
                    `🤖 *Systeemarchitect:* **Appie (Klapstoel)** 🔥`
                )
                .setTimestamp();

            // ─── GADGET EMBED 2: TECH STATS & INJECTIES (Terminal-Style) ───
            const modulesEmbed = new EmbedBuilder()
                .setTitle('📡 GEACTIVEERDE INJECTIES & AUTOMATION GADGETS')
                .setColor('#1a1a1a')
                .addFields(
                    { 
                        name: '💎 MODULE 01 // PARTNER-SYSTEM v2', 
                        value: '```md\n# STATUS: OPTIMALIZED\n* Database-leaks volledig gedicht.\n* Scant nu 100% accuraat elke partnerlink.\n* Waarde direct berekend op €0,50 per partner.
```' 
                    },
                    { 
                        name: '💬 MODULE 02 // AI SFEER-METER', 
                        value: '```md\n# STATUS: OPERATIONAL\n* Analyseert live de vibe in #┃💭・kletshoek.\n* Bij 96%+ triggeren we een server-brede Sfeer Drop.\n* Toxic gedrag trekt de meter direct omlaag.```' 
                    },
                    { 
                        name: '⚔️ MODULE 03 // PARTNER DUELS & CREDITS', 
                        value: '```md\n# STATUS: ACTIVE\n* Iedereen start direct met 100 NexSpace Credits.\n* Daag Elite Leden uit voor 24-uurs partnerduels.\n* De winnaar pakt de volledige inzet via het systeem.
```' 
                    },
                    { 
                        name: '🏪 MODULE 04 // BLACK MARKET SHOP', 
                        value: '```md\n# STATUS: ONLINE\n* Koop illegale server-privileges met je credits.\n* Koop een Duel Schild om je wallet te beschermen bij verlies.```' 
                    },
                    { 
                        name: '🔥 MODULE 05 // DAILY CHAT STREAKS', 
                        value: '```md\n# STATUS: TRACKING\n* Daily kletshoek activiteit wordt bijgehouden.\n* Bouw een streak op voor multipliers op al je winsten.
```' 
                    },
                    { 
                        name: '👾 MODULE 06 // SYSTEM GLITCH EVENTS', 
                        value: '
