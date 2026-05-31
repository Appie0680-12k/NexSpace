import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
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
        
        try {
            // Haal alle actieve invites op van de server
            const invites = await interaction.guild.invites.fetch();
            
            // Filter de invites die zijn aangemaakt door deze gebruiker
            const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === targetUser.id);

            let totaalGebruikt = 0;

            // Tel alle uses van de nog actieve codes op
            userInvites.forEach(inv => {
                totaalGebruikt += inv.uses;
            });

            // Embed maken voor een strakke look
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`✉️ Invite Statistieken voor ${targetUser.username}`)
                .setDescription(`Hier is het overzicht van de uitnodigingen:`)
                .addFields(
                    { name: 'Actieve Links', value: `**${userInvites.size}** werkende links`, inline: true },
                    { name: 'Totaal Mensen Gekomen', value: `**${totaalGebruikt}** gebruikers`, inline: true }
                )
                .setFooter({ text: 'Volledig verwijderde invite-links worden door Discord helaas niet meegeteld.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'Er ging iets mis bij het ophalen van de invites. Heeft de bot wel de juiste rechten?', 
                ephemeral: true 
            });
        }
    },
};
