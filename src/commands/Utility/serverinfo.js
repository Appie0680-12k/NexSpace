import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Toont uitgebreide informatie over NexSpace'),

    async execute(interaction) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner();
        
        const infoEmbed = new EmbedBuilder()
            .setTitle(`📊 Server Statistieken | ${guild.name}`)
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { 
                    name: '👑 Eigenaar', 
                    value: `${owner.user.tag}`, 
                    inline: true 
                },
                { 
                    name: '💻 Developer', 
                    value: '<@834169622533308426>', // Dit is de vermelding voor <@1248914495389040683>
                    inline: true 
                },
                { 
                    name: '📅 Gemaakt op', 
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, 
                    inline: true 
                },
                { 
                    name: '👥 Leden', 
                    value: `**${guild.memberCount}** leden`, 
                    inline: true 
                },
                { 
                    name: '💎 Boosts', 
                    value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, 
                    inline: true 
                },
                { 
                    name: '🆔 Server ID', 
                    value: `\`${guild.id}\``, 
                    inline: true 
                }
            )
            .setFooter({ text: `NexSpace | Gevraagd door ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [infoEmbed] });
    },
};
