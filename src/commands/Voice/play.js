import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import play from 'play-dl';

if (!global.musicQueue) global.musicQueue = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Speel een nummer af via een link of zoekterm!')
        .addStringOption(option => 
            option.setName('nummer')
                .setDescription('De Spotify/YouTube link of de naam van het nummer')
                .setRequired(true)),

    async execute(interaction) {
        const { member, guild } = interaction;
        const query = interaction.options.getString('nummer');

        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet in een spraakkanaal zitten om dit te gebruiken!', ephemeral: true });
        }

        await interaction.deferReply();

        let queue = global.musicQueue.get(guild.id);
        if (!queue) {
            queue = { connection: null, player: createAudioPlayer(), songs: [], textChannel: interaction.channel };
            global.musicQueue.set(guild.id, queue);
        }

        try {
            let streamUrl = query;
            let title = query;

            if (play.sp_validate(query) !== false) {
                const spotifyData = await play.spotify(query);
                const searchResults = await play.search(`${spotifyData.name} ${spotifyData.artists[0]?.name}`, { limit: 1 });
                if (searchResults.length === 0) return interaction.editReply('❌ Kon dit Spotify nummer niet vinden op het netwerk.');
                streamUrl = searchResults[0].url;
                title = searchResults[0].title;
            } else if (!query.startsWith('http')) {
                const searchResults = await play.search(query, { limit: 1 });
                if (searchResults.length === 0) return interaction.editReply('❌ Geen resultaten gevonden voor deze zoekopdracht.');
                streamUrl = searchResults[0].url;
                title = searchResults[0].title;
            }

            queue.songs.push({ url: streamUrl, title });

            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: member.voice.channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true // Bot komt onhoorbaar (deafened) binnen
                });

                queue.connection.subscribe(queue.player);
                playSong(guild.id, queue.songs[0]);
                await interaction.editReply(`🎶 Nu aan het afspelen: **${title}**`);
            }
