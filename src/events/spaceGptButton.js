import { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'start_gpt_session') {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const channelName = `gpt-${interaction.user.username}`;

            const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
            if (existingChannel) {
                return interaction.editReply({ content: `❌ Je hebt al een actieve sessie! Ga naar ${existingChannel}`, ephemeral: true });
            }

            const gptChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🤖 Space-GPT Privé Console')
                .setDescription(`Welkom <@${interaction.user.id}>! Dit kanaal is volledig privé tussen jou en de servereigenaren.\n\nStel complexe businessvragen of typ bijvoorbeeld: *"Maak een afbeelding van een futuristische skyline"* om AI kunst te creëren.`)
                .setColor('#00fbff');

            await gptChannel.send({ embeds: [welcomeEmbed] });
            await interaction.editReply({ content: `✅ Je privé AI chat is aangemaakt! Klik hier: ${gptChannel}`, ephemeral: true });
        }
    }
};
