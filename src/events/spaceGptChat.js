import { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';

export default {
    name: Events.InteractionCreate, // We luisteren eerst naar de interacties (zoals de knop)
    async execute(interaction) {
        const client = interaction.client;

        // ==========================================================
        // DEEL 1: LOGICA VOOR DE "START PRIVÉ AI CHAT" KNOP
        // ==========================================================
        if (interaction.isButton() && interaction.customId === 'start_gpt_session') {
            // Geef direct antwoord aan Discord om de 'interaction failed' error te voorkomen
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                const channelName = `gpt-${interaction.user.username}`;

                // Check of deze gebruiker al een chat open heeft staan
                const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
                if (existingChannel) {
                    return await interaction.editReply({ content: `❌ Je hebt al een actieve sessie! Ga naar ${existingChannel}` });
                }

                // Maak het kanaal privé aan voor de gebruiker en admins
                const gptChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel], // Verberg voor iedereen
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Toestaan voor de gebruiker
                        },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🤖 Space-GPT Privé Console')
                    .setDescription(`Welkom <@${interaction.user.id}>! Dit kanaal is volledig privé tussen jou en de servereigenaren.\n\n**Wat kan je hier doen?**\n• Stel complexe business- of levensvragen.\n• Vraag om code, teksten of samenvattingen.\n• Typ bijvoorbeeld: *"Maak een afbeelding van een futuristische skyline"* om gratis AI kunst te creëren.`)
                    .setColor('#00fbff')
                    .setFooter({ text: 'Typ je bericht om te beginnen.' });

                await gptChannel.send({ embeds: [welcomeEmbed] });
                return await interaction.editReply({ content: `✅ Je privé AI chat is aangemaakt! Klik hier: ${gptChannel}` });

            } catch (error) {
                console.error('Fout bij aanmaken gpt kanaal:', error);
                return await interaction.editReply({ content: '❌ Er ging iets mis bij het aanmaken van je privé-kanaal.' });
            }
        }
    }
};

// ==========================================================
// DEEL 2: CHAT LOGICA (GEMINI & POLLINATIONS AFBEELDINGEN)
// ==========================================================
// Omdat de TitanBot-template aparte event-bestanden fijn vindt, koppelen we hier de MessageCreate handler los aan de client zodra hij start
export { Events as MessageEvent };
