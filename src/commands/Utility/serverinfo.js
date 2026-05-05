import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Toont uitgebreide informatie over NexSpace'),

    async execute(interaction) {
        const { guild } = interaction;
        const owner = await guild.fetchOwner();
        
        const infoEmbed = new EmbedBuilder()
            .setTitle(`Informatie over ${guild.name}`)
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setImage(guild.bannerURL({ size: 1024 })) // Toont de banner als je die hebt
            .addFields(
                { 
                    name: '👑 Eigenaar', 
                    value: `${owner.user.tag}`, 
                    inline: true 
                },
                { 
                    name: '📅 Gemaakt op', 
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, 
                    inline: true 
                },
                { 
                    name: '🆔 Server ID', 
                    value: `\`${guild.id}\``, 
                    inline: true 
                },
                { 
                    name: '👥 Leden', 
                    value: `Totaal: **${guild.memberCount}**`, 
                    inline: true 
                },
                { 
                    name: '🛡️ Verificatie', 
                    value: `${guild.verificationLevel}`, 
                    inline: true 
                },
                { 
                    name: '💎 Boosts', 
                    value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, 
                    inline: true 
                },
                { 
                    name: '💬 Kanalen', 
                    value: `Totaal: **${guild.channels.cache.size}**`, 
                    inline: true 
                },
                { 
                    name: '🎭 Rollen', 
                    value: `**${guild.roles.cache.size}** rollen`, 
                    inline: true 
                }
            )
            .setFooter({ text: `NexSpace | Gevraagd door ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [infoEmbed] });
    },
};

