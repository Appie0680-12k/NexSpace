import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start een professionele NexSpace giveaway')
        .addStringOption(option =>
            option.setName('prijs')
                .setDescription('Wat kan men winnen?')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winnaars')
                .setDescription('Aantal winnaars')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duur')
                .setDescription('Hoe lang duurt het? (b.v. 1d, 12h, 30m)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanaal')
                .setDescription('In welk kanaal moet de giveaway?')
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const prijs = interaction.options.getString('prijs');
        const winnaars = interaction.options.getInteger('winnaars');
        const duurStr = interaction.options.getString('duur');
        const targetChannel = interaction.options.getChannel('kanaal') || interaction.channel;

        // Tijd parser: 1d -> ms, 1h -> ms, etc.
        const msPerUnit = { d: 86400000, h: 3600000, m: 60000; s: 1000 };
        const match = duurStr.match(/^(\d+)([dhms])$/i);
        if (!match) return interaction.reply({ content: '🚫 Ongeldig tijdsformaat. Gebruik b.v. `1d`, `12h` of `30m`.', ephemeral: true });
        
        const tijdMs = parseInt(match[1]) * msPerUnit[match[2].toLowerCase()];
        const eindTijdUnix = Math.floor((Date.now() + tijdMs) / 1000);

        // De "speciale en mooiere" Embed
        const giveawayEmbed = new EmbedBuilder()
            .setTitle(`🎁 NEXSPACE GIVEAWAY START!`)
            .setColor('#5865F2') // De blauwe NexSpace kleur
            .setDescription(`**${interaction.user}** start een vette giveaway!\nKlik op de 🎉 emoji hieronder om mee te doen.`)
            
            // DIT MAAKT HET MOOIER: Overzichtelijke velden met emoji's
            .addFields(
                { name: '🏆 Prijs:', value: `\`\`\`${prijs}\`\`\``, inline: false },
                { name: '👤 Winnaars:', value: `**${winnaars}** persoon/personen`, inline: true },
                { name: '⏳ Eindigt:', value: `<t:${eindTijdUnix}:R> (<t:${eindTijdUnix}:f>)`, inline: true }
            )
            
            // DIT MAAKT HET SPECIAAL: Een unieke thumbnail (bijv. NexSpace logo)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true })) 
            
            // DIT IS DE BRANDING: Developer en Footer
            .setFooter({ text: `NexSpace | Ontwikkeld door @Appie0680`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const message = await targetChannel.send({ embeds: [giveawayEmbed] });
        await message.react('🎉');

        await interaction.reply({ content: `✅ Giveaway succesvol gestart in ${targetChannel}!`, ephemeral: true });

        // Timer om de winnaars te trekken
        setTimeout(async () => {
            const fetchedMessage = await targetChannel.messages.fetch(message.id);
            const reaction = fetchedMessage.reactions.cache.get('🎉');
            if (!reaction) return; // Bericht verwijderd?

            await reaction.users.fetch();
            const validUsers = reaction.users.cache.filter(user => !user.bot);

            if (validUsers.size === 0) {
                const noWinnersEmbed = new EmbedBuilder()
                    .setTitle(`🎁 GIVEAWAY GEËINDIGD`)
                    .setColor('#FF0000')
                    .setDescription(`Helaas, niemand heeft meegedaan aan de giveaway voor: **${prijs}**.`)
                    .setFooter({ text: 'NexSpace Community' });
                return message.edit({ embeds: [noWinnersEmbed] });
            }

            // Trek de winnaars
            const winnerArray = validUsers.random(winnaars);
            const winnerMentions = winnerArray.map(u => `<@${u.id}>`).join(', ');

            const endEmbed = new EmbedBuilder()
                .setTitle(`🎉 WE HEBBEN WINNAARS!`)
                .setColor('#00FF00')
                .setDescription(`De giveaway voor: **${prijs}** is afgelopen.\n\nGefeliciteerd: ${winnerMentions}!\n\nOpen een ticket om je prijs te claimen.`)
                .setFooter({ text: 'NexSpace Community' })
                .setTimestamp();

            await message.edit({ embeds: [endEmbed] });
            await targetChannel.send(`🏆 Gefeliciteerd ${winnerMentions}! Jullie hebben gewonnen: **${prijs}**! Open een ticket.`);
        }, tijdMs);
    },
};
