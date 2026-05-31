import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Laat de bot de spraakoproep verlaten.'),

    async execute(interaction) {
        const queue = global.musicQueue?.get(interaction.guild.id);

        if (!queue || !queue.connection) {
            return interaction.reply({ content: '❌ Ik zit momenteel niet in een spraakkanaal!', ephemeral: true });
        }

        queue.connection.destroy();
        global.musicQueue.delete(interaction.guild.id);

        await interaction.reply('👋 Spraakkanaal succesvol verlaten. Tot de volgende!');
    },
};
