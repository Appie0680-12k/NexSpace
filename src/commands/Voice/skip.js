import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Sla het huidige nummer over en speel de volgende in de wachtrij.'),

    async execute(interaction) {
        const queue = global.musicQueue?.get(interaction.guild.id);

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet in een spraakkanaal zitten om muziek over te slaan!', ephemeral: true });
        }

        if (!queue || queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Er speelt momenteel geen muziek die ik kan overslaan.', ephemeral: true });
        }

        // Dit stopt de huidige track. De code in play.js merkt dit op en start automatisch het volgende nummer.
        queue.player.stop();
        return interaction.reply('⏭️ Nummer succesvol overgeslagen!');
    },
};
