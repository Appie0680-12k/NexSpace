import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Zet een gebruiker op de blacklist.')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('De persoon die op de blacklist moet')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reden')
                .setDescription('De reden voor de blacklist')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('gebruiker');
        const reden = interaction.options.getString('reden');
        const adminChannel = interaction.guild.channels.cache.find(c => c.name === 'administratie');

        const embed = new EmbedBuilder()
            .setTitle('⚫ BLACKLIST TOEGEVOEGD')
            .setColor('#000000')
            .addFields(
                { name: '👤 Gebruiker', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: '🛡️ Uitgevoerd door', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📄 Reden', value: `\`${reden}\``, inline: false }
            )
            .setTimestamp();

        if (adminChannel) {
            await adminChannel.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ <@${targetUser.id}> is succesvol op de blacklist gezet in <#${adminChannel.id}>.`, flags: MessageFlags.Ephemeral });
        } else {
            return interaction.reply({ content: '❌ Kanaal `#administratie` niet gevonden.', flags: MessageFlags.Ephemeral });
        }
    }
};
