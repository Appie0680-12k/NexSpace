```javascript
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Plaats een officiële server- of bot-update in het changelogs kanaal.'),

    async execute(interaction, guildConfig, client) {
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

        // Toon de pop-up
        await interaction.showModal(modal);
    }
};

```
