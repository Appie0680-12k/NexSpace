import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Sla het huidige nummer over en ga naar de volgende in de wachtrij!'),

    async execute(interaction) {
        const queue = global.musicQueue?.get(interaction.guild.id);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Er speelt momenteel helemaal geen muziek die ik kan overslaan.', ephemeral: true });
        }

        queue.player.stop();
        await interaction.reply('⏭️ Nummer overgeslagen!');
    },
};
