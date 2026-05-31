const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk hoeveel mensen jij hebt uitgenodigd naar de server!')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('De gebruiker waarvan je de invites wilt zien (leeg voor jezelf)')
                .setRequired(false)),

    async execute(interaction) {
        // Als er geen gebruiker wordt genoemd, kijken we naar de persoon die het commando typt
        const targetUser = interaction.options.getUser('gebruiker') || interaction.user;
        
        // Haal alle actieve invites op van de server
        const invites = await interaction.guild.invites.fetch();
        
        // Filter de invites die zijn aangemaakt door de doelkanshebber
        const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === targetUser.id);

        let huidigeInvites = 0;
        let totaalGebruikt = 0;

        // Loop door de actieve invites heen om het aantal te tellen
        userInvites.forEach(inv => {
            huidigeInvites += inv.uses;
            totaalGebruikt += inv.uses; // Dit telt alle uses van de nog actieve codes op
        });

        // Embed maken voor een mooie ChatGPT-achtige look
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`✉️ Invite Statistieken voor ${targetUser.username}`)
            .setDescription(`Hier is het overzicht van de uitnodigingen:`)
            .addFields(
                { name: 'Actieve Invites (Nu geldig)', value: `**${userInvites.size}** codes`, inline: true },
                { name: 'Totaal Mensen Gekomen', value: `**${totaalGebruikt}** gebruikers`, inline: true }
            )
            .setFooter({ text: 'Let op: Volledig verwijderde invite-links kunnen niet door Discord worden teruggehaald.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
