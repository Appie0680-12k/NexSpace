import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Plaats een server- of bot-update.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('normaal')
                .setDescription('Open de pop-up voor een handmatige, normale update.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('big')
                .setDescription('🚀 Lanceer direct de exclusieve NexSpace Automation Mega-Update met gadgets.')),

    async execute(interaction, guildConfig, client) {
        const sub = interaction.options.getSubcommand();

        // ─── OPTIE 1: DE NORMALE UPDATE (JOUW OUDE MODAL) ───
        if (sub === 'normaal') {
            const modal = new ModalBuilder()
                .setCustomId('update_modal')
                .setTitle('Nieuwe Update Doorgeven');

            const titleInput = new TextInputBuilder()
                .setCustomId('update_title')
                .setLabel('Titel van de update')
                .setPlaceholder('Bijv: Bot Update v2.1 of Server Wijziging')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const changeInput = new TextInputBuilder()
                .setCustomId('update_changes')
                .setLabel('Wat is er veranderd? (Gebruik eventueel - )')
                .setPlaceholder('- /warn commando gefixt\n- Snelheid verbeterd\n- Pop-ups toegevoegd')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const versionInput = new TextInputBuilder()
                .setCustomId('update_version')
                .setLabel('Versie / Type (Optioneel)')
                .setPlaceholder('Bijv: v2.1.0 of [SERVER]')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(changeInput),
                new ActionRowBuilder().addComponents(versionInput)
            );

            return await interaction.showModal(modal);
        }

        // ─── OPTIE 2: DE EXCLUSIEVE BIG UPDATE (GIGANTISCH MET GADGETS) ───
        if (sub === 'big') {
            // Direct antwoorden zodat Discord niet gaat hangen
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                const changelogChannel = guild.channels.cache.find(c => 
                    c.name.includes('changelog') || c.name.includes('update') || c.name.includes('announcement')
                );

                if (!changelogChannel) {
                    return await interaction.editReply({ content: '❌ Kon geen geschikt update- of changelogkanaal vinden.' });
                }

                // 🌐 EMBED 1: MAINFRAME INTRO
                const introEmbed = new EmbedBuilder()
                    .setTitle('🚀 MAIN-FRAME UPGRADE: SYSTEM OVERHAUL')
                    .setColor('#00fbff')
                    .setDescription(
                        `⚡ **ATTENTIE NEXSPACE COMMUNITY** ⚡\n\n` +
                        `Achter de schermen is het mainframe volledig op de schop gegooid. Vanaf **NU** staat er een gigantische server-brede update live die onze economie, interactiviteit en activiteit naar een ongekend niveau tilt!\n\n` +
                        `🤖 *Systeemarchitect:* **Appie (Klapstoel)** 🔥`
                    )
                    .setTimestamp();

                // 📡 EMBED 2: TECH GADGETS & INJECTIES (Terminal-Style)
                const modulesEmbed = new EmbedBuilder()
                    .setTitle('📡 GEACTIVEERDE INJECTIES & AUTOMATION GADGETS')
                    .setColor('#1a1a1a')
                    .addFields(
                        { name: '💎 MODULE 01 // PARTNER-SYSTEM v2', value: '```md\n# STATUS: OPTIMALIZED\n* Database-leaks volledig gedicht.\n* Scant nu 100% accuraat elke partnerlink.\n* Waarde direct berekend op €0,50 per partner.
```' },
                        { name: '💬 MODULE 02 // AI SFEER-METER', value: '```md\n# STATUS: OPERATIONAL\n* Analyseert live de vibe in #┃💭・kletshoek.\n* Bij 96%+ triggeren we een server-brede Sfeer Drop.\n* Toxic gedrag trekt de meter direct omlaag.```' },
                        { name: '⚔️ MODULE 03 // PARTNER DUELS & CREDITS', value: '```md\n# STATUS: ACTIVE\n* Iedereen start direct met 100 NexSpace Credits.\n* Daag Elite Leden uit voor 24-uurs partnerduels.\n* De winnaar pakt de volledige inzet via het systeem.
```' },
                        { name: '🏪 MODULE 04 // BLACK MARKET SHOP', value: '```md\n# STATUS: ONLINE\n* Koop privileges met credits.\n* Duel Schild: bescherm je wallet bij verlies.```' },
                        { name: '🔥 MODULE 05 // DAILY CHAT STREAKS', value: '```md\n# STATUS: TRACKING\n* Daily kletshoek activiteit bijgehouden.\n* Bouw streak = multipliers op al je winsten.
```' },
                        { name: '👾 MODULE 06 // SYSTEM GLITCH EVENTS', value: '```md\n# STATUS: DANGEROUS\n* 0.5% kans per bericht op mainframe-hack.\n* Los code op, claim de Server Debugger rol.```' }
                    );

                // 📚 EMBED 3: INSTRUCTIONS FOOTER
                const infoEmbed = new EmbedBuilder()
                    .setTitle('📚 SYSTEEM CAPACITEITEN & INTERACTIE')
                    .setColor('#00fbff')
                    .setDescription(`Alle systemen zijn vanaf nu live operationeel. Gebruik de onderstaande knoppen om direct naar de belangrijkste kanalen te navigeren!`)
                    .setFooter({ text: 'NexSpace Automation • Codebase by Appie (Klapstoel)', iconURL: guild.iconURL() });

                // 🎛️ INTERACTIEVE GADGETS (BUTTONS)
                const keybindsChannel = guild.channels.cache.find(c => c.name.includes('keybinds'));
                const kletshoekChannel = guild.channels.cache.find(c => c.name.includes('kletshoek'));
                const buttonRow = new ActionRowBuilder();

                if (keybindsChannel) {
                    buttonRow.addComponents(
                        new ButtonBuilder()
                            .setLabel('⌨️ Bekijk Commando Overzicht')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/channels/${guild.id}/${keybindsChannel.id}`)
                    );
                }

                if (kletshoekChannel) {
                    buttonRow.addComponents(
                        new ButtonBuilder()
                            .setLabel('💭 Naar de Kletshoek')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/channels/${guild.id}/${kletshoekChannel.id}`)
                    );
                }

                const componenten = buttonRow.components.length > 0 ? [buttonRow] : [];
                
                // Verstuur alles tegelijkertijd in het kanaal
                await changelogChannel.send({ embeds: [introEmbed, modulesEmbed, infoEmbed], components: componenten });
                await interaction.editReply({ content: '⚡ **MEGA-UPDATE SUCCESVOL GELANCEERD! De 3 embeds en knoppen staan live.**' });

            } catch (error) {
                console.error('Fout bij big-update:', error);
                await interaction.editReply({ content: '❌ Mainframe error tijdens het pushen van de mega-update.' });
            }
        }
    }
};
