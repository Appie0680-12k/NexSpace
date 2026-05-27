import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-gpt')
        .setDescription('Spawnt het Space-GPT AI paneel in dit kanaal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Alleen voor admins!

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🧠 NexSpace Intelligence Portal')
            .setDescription('Klik op de onderstaande knop om een beveiligde privé-sessie met **Space-GPT** te starten. Stel vragen, analyseer documenten of genereer afbeeldingen.')
            .setColor('#00fbff')
            .setFooter({ text: 'NexSpace Premium AI Services' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_gpt_session')
                .setLabel('Start Privé AI Chat')
                .setEmoji('🤖')
                .setStyle(ButtonStyle.Premium)
        );

        // Stuur het paneel in het kanaal waar het commando wordt gebruikt
        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        // Geef een onzichtbare (ephemeral) melding aan de admin dat het gelukt is
        return interaction.reply({ content: '✅ Space-GPT Paneel succesvol geplaatst!', ephemeral: true });
    }
};
