import { SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import play from 'play-dl';

if (!global.musicQueue) global.musicQueue = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Laat de bot joinen en speel een nummer af!')
        .addStringOption(option => 
            option.setName('nummer')
                .setDescription('De Spotify/YouTube link of de naam van het nummer')
                .setRequired(true)),

    async execute(interaction) {
        const { member, guild } = interaction;
        const query = interaction.options.getString('nummer');

        // 1. Check of de gebruiker zelf wel in een spraakkanaal zit
        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ Je moet in een spraakkanaal zitten zodat ik naar je toe kan komen!', ephemeral: true });
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

            // Zoeken via Spotify of YouTube
            if (play.sp_validate(query) !== false) {
                const spotifyData = await play.spotify(query);
                const searchResults = await play.search(`${spotifyData.name} ${spotifyData.artists[0]?.name}`, { limit: 1 });
                if (searchResults.length === 0) return interaction.editReply('❌ Kon dit Spotify nummer niet vinden.');
                streamUrl = searchResults[0].url;
                title = searchResults[0].title;
            } else if (!query.startsWith('http')) {
                const searchResults = await play.search(query, { limit: 1 });
                if (searchResults.length === 0) return interaction.editReply('❌ Geen resultaten gevonden.');
                streamUrl = searchResults[0].url;
                title = searchResults[0].title;
            }

            queue.songs.push({ url: streamUrl, title });

            // 2. Als de bot nog niet in het kanaal zit, laat hem NU joinen
            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: member.voice.channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true
                });

                queue.connection.subscribe(queue.player);
                playSong(guild.id, queue.songs[0]);
                await interaction.editReply(`🔊 Binnengekomen in **${member.voice.channel.name}** en nu aan het afspelen: **${title}**`);
            } else {
                await interaction.editReply(`➕ Toegevoegd aan de wachtrij: **${title}**`);
            }

        } catch (error) {
            console.error(error);
            interaction.editReply('❌ Er ging iets mis bij het verbinden of laden van de audio.');
        }
    },
};

async function playSong(guildId, song) {
    const queue = global.musicQueue.get(guildId);
    if (!song) {
        if (queue.connection) queue.connection.destroy();
        global.musicQueue.delete(guildId);
        return;
    }

    try {
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        
        queue.player.play(resource);
        
        queue.player.once(AudioPlayerStatus.Idle, () => {
            queue.songs.shift();
            playSong(guildId, queue.songs[0]);
        });
    } catch (err) {
        console.error(err);
        queue.songs.shift();
        playSong(guildId, queue.songs[0]);
    }
}
