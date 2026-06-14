import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Toon informatie over de server en de bot'),
        
    async execute(interaction, guildConfig, client) {
        const { guild } = interaction;
        
        // Haal live data op van de server
        const serverNaam = guild.name;
        const ledenAantal = guild.memberCount;
        const kanalenAantal = guild.channels.cache.size;
        const rollenAantal = guild.roles.cache.size;
        const botNaam = client.user.username;
        const ping = client.ws.ping;
        const serverIcon = guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();

        // Bouw de embed exact op zoals in 1000120394.png
        const infoEmbed = new EmbedBuilder()
            .setTitle('ℹ️ Server & Bot Info')
            .setDescription(`Deze bot is gemaakt door **Klapstoel**.\nJoin ons via: [Klik hier](https://discord.gg/jouw-invite-link)`) // Pas eventueel de invite-link aan
            .setColor('#00fbff') // De blauw/cyan kleur uit je voorbeeld
            .setThumbnail(serverIcon)
            .addFields(
                { name: 'Servernaam', value: `${serverNaam}`, inline: true },
                { name: 'Leden', value: `${ledenAantal}`, inline: true },
                { name: 'Kanalen', value: `${kanalenAantal}`, inline: true },
                { name: 'Rollen', value: `${rollenAantal}`, inline: true },
                { name: 'Botnaam', value: `${botNaam}`, inline: true },
                { name: 'Ping', value: `${ping}ms`, inline: true }
            )
            .setFooter({ 
                text: `Aangevraagd door ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            });

        // Verzend het antwoord naar de gebruiker
        return interaction.reply({ embeds: [infoEmbed] });
    }
};
