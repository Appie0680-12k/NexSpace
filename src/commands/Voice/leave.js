import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Laat de bot het spraakkanaal verlaten en wis de wachtrij.'),

    async execute(interaction) {
        const queue = global.musicQueue?.get(interaction.guild.id);

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet in een spraakkanaal zitten om dit te doen!', ephemeral: true });
        }

        if (queue) {
            if (queue.connection) queue.connection.destroy();
            global.musicQueue.delete(interaction.guild.id);
            return interaction.reply('👋 Spraakkanaal succesvol verlaten en wachtrij geleegd!');
        } else {
            // Voor het geval de bot wel in een kanaal zit, maar er geen actieve wachtrij (meer) is
            const { joinVoiceChannel } = await import('@discordjs/voice');
            const connection = joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            
            if (connection) {
                connection.destroy();
                return interaction.reply('👋 Kanaal verlaten!');
            }
            
            return interaction.reply({ content: '❌ Ik zit momenteel niet in een spraakkanaal.', ephemeral: true });
        }
    },
};
