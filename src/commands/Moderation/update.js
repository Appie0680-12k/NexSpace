```javascript
import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

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
                .setDescription('🚀 Grote exclusieve update met gadgets (optioneel aan te passen voor toekomstige updates).')
                .addStringOption(option =>
                    option.setName('titel')
                        .setDescription('Aangepaste titel voor de grote update (optioneel).')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('wijzigingen')
                        .setDescription('Aangepaste tekst/wijzigingen van onbeperkte lengte (optioneel).')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('versie')
                        .setDescription('Aangepaste versie, bijv: v2.5.0 of [HOTFIX] (optioneel).')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('banner')
                        .setDescription('URL naar een banner afbeelding voor bovenaan de update (optioneel).')
                        .setRequired(false))),

    async execute(interaction, guildConfig, client) {
        const sub = interaction.options.getSubcommand();

        // ─── OPTIE 1: DE NORMALE UPDATE (INCLUSIEF DIRECTE AFHANDELING) ───
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

            // Toon de pop-up aan de gebruiker
            await interaction.showModal(modal);

            // Wacht binnen DIT script totdat de gebruiker op "Verzenden" klikt (maximaal 5 minuten)
            try {
                const submitted = await interaction.awaitModalSubmit({
                    time: 300000, 
                    filter: i => i.customId === 'update_modal' && i.user.id === interaction.user.id,
                });

                // Vertel Discord direct dat we de invoer verwerken (stopt het laadscherm!)
                await submitted.deferReply({ ephemeral: true });

                const title = submitted.fields.getTextInputValue('update_title');
                const changes = submitted.fields.getTextInputValue('update_changes');
                const version = submitted.fields.getTextInputValue('update_version') || 'v1.0.0';

                const changelogChannel = interaction.guild.channels.cache.find(c => 
                    c.name.includes('changelog') || c.name.includes('update') || c.name.includes('announcement')
                );

                if (!changelogChannel) {
                    return await submitted.editReply({ content: '❌ Kon geen geschikt update- of changelogkanaal vinden.' });
                }

                // Prachtige normale embed opbouwen
                const updateEmbed = new EmbedBuilder()
                    .setTitle(`📢 ${title}`)
                    .setColor('#00fbff')
                    .setDescription(changes)
                    .addFields({ name: '📌 Versie / Type', value: `\`${version}\``, inline: true })
                    .setFooter({ text: `Doorgegeven door ${interaction.user.username} • NexSpace`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                await changelogChannel.send({ embeds: [updateEmbed] });
                await submitted.editReply({ content: '✅ **De server-update is succesvol geplaatst!**' });

            } catch (err) {
                // Vangt op als de gebruiker de pop-up sluit zonder te verzenden of als er een timeout is
                console.log('Modal niet binnen de tijd ingediend of gesloten.');
            }
            return;
        }

        // ─── OPTIE 2: DE EXCLUSIEVE BIG UPDATE (GIGANTISCH MET GADGETS) ───
        if (sub === 'big') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                const changelogChannel = guild.channels.cache.find(c => 
                    c.name.includes('changelog') || c.name.includes('update') || c.name.includes('announcement')
                );

                if (!changelogChannel) {
                    return await interaction.editReply({ content: '❌ Kon geen geschikt update- of changelogkanaal vinden.' });
                }

                const customTitle = interaction.options.getString('titel');
                const customChanges = interaction.options.getString('wijzigingen');
                const customVersion = interaction.options.getString('versie');
                const customBanner = interaction.options.getString('banner');

                const introEmbed = new EmbedBuilder()
                    .setTitle(customTitle ? `🚀 ${customTitle.toUpperCase()}` : '🚀 MAIN-FRAME UPGRADE: SYSTEM OVERHAUL')
                    .setColor('#00fbff')
                    .setTimestamp();

                if (customChanges) {
                    introEmbed.setDescription(
                        `⚡ **ATTENTIE NEXSPACE COMMUNITY** ⚡\n\n` +
                        `Er is zojuist een grote server-brede update live gezet! Lees de details van deze upgrade hieronder aandachtig door.\n\n` +
                        `🤖 *Systeemarchitect:* **Appie (Klapstoel)** 🔥`
                    );
                } else {
                    introEmbed.setDescription(
                        `⚡ **ATTENTIE NEXSPACE COMMUNITY** ⚡\n\n` +
                        `Achter de schermen is het mainframe volledig op de schop gegooid. Vanaf **NU** staat er een gigantische server-brede update live die onze economie, interactiviteit en activiteit naar een ongekend niveau tilt!\n\n` +
                        `🤖 *Systeemarchitect:* **Appie (Klapstoel)** 🔥`
                    );
                }

                if (customBanner) {
                    introEmbed.setImage(customBanner);
                }

                const modulesEmbed = new EmbedBuilder()
                    .setColor('#1a1a1a');

                if (customChanges) {
                    modulesEmbed.setTitle('📡 GEGEVENS & UPGRADE LOGS')
                        .setDescription(`\`\`\`md\n${customChanges}\`\`\``);
                } else {
                    modulesEmbed.setTitle('📡 GEACTIVEERDE INJECTIES & AUTOMATION GADGETS')
                        .addFields(
                            { name: '💎 MODULE 01 // PARTNER-SYSTEM v2', value: '

```
