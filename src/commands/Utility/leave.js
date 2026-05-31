import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Laat de bot het kanaal verlaten.'),

    async execute(interaction) {
        const queue = global.musicQueue?.get(interaction.guild.id);

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet in een spraakkanaal zitten!', ephemeral: true });
        }

        if (queue) {
            if (queue.connection) queue.connection.destroy();
            global.musicQueue.delete(interaction.guild.id);
            return interaction.reply('👋 Kanaal verlaten en wachtrij gewist!');
        } else {
            const { joinVoiceChannel } = await import('@discordjs/voice');
            const connection = joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });
            if (connection) connection.destroy();
            return interaction.reply('👋 Kanaal verlaten!');
        }
    },
};
