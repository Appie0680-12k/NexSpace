import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Laat de bot handmatig je spraakkanaal binnenkomen.'),

    async execute(interaction) {
        const { member, guild } = interaction;

        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet eerst zelf in een spraakkanaal zitten!', ephemeral: true });
        }

        try {
            joinVoiceChannel({
                channelId: member.voice.channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true
            });

            return interaction.reply(`🔊 Succesvol verbonden met **${member.voice.channel.name}**!`);
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: '❌ Er ging iets mis bij het proberen te verbinden met het kanaal.', ephemeral: true });
        }
    },
};
