import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pb')
        .setDescription('Stuurt het NexSpace promotiebericht'),

    async execute(interaction) {
        const pbEmbed = new EmbedBuilder()
            .setTitle('Welkom bij NexSpace Community')
            .setColor('#5865F2') 
            .setDescription(`Ben je op zoek naar een actieve Discord server? Dan is NexSpace Community een goede plek om deel uit te maken van een groeiende community.\n\n` +
                `**Wat bieden wij?**\n` +
                `• Games om samen te spelen\n` +
                `• Regelmatige events\n` +
                `• Giveaways\n` +
                `• Actieve chatkanalen\n` +
                `• Support voor leden\n\n` +
                `**Wat zoeken wij?**\n` +
                `- Actieve partner medewerkers\n` +
                `*Dit wordt betaald met 1,- per partner!*\n\n` +
                `Ons doel is om een georganiseerde en actieve community op te bouwen waar leden kunnen gamen, deelnemen aan events en met elkaar in contact kunnen komen.\n\n` +
                `**Interesse?** Join de server via de link hieronder:\n` +
                `https://discord.gg/Q5Nfp3kFrP`)
            .setFooter({ text: 'NexSpace Community' })
            .setTimestamp();

        await interaction.reply({ embeds: [pbEmbed] });
    },
};
