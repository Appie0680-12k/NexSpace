import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk je eigen invite statistieken of die van een ander lid')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Bekijk invites van iemand')
                .setRequired(false)
        ),

    async execute(interaction) {
        // We halen client rechtstreeks uit de interaction, dit werkt ALTIJD foutloos
        const { client, guild, user } = interaction;
        
        const target = interaction.options.getUser('user') || user;
        const dbKey = `invites:${guild.id}:${target.id}`;

        // TEST LOGS: Deze verschijnen nu veilig in je Railway console zonder crashes
        console.log(`[INVITES CMD] Commando uitgevoerd voor ${target.tag}`);
        console.log(`[INVITES CMD] Database aanwezig:`, !!client.db);

        try {
            let totalJoins = 0;
            let totalLeaves = 0;

            // Haal de statistieken op uit de database
            if (client.db) {
                const stats = await client.db.get(dbKey);
                if (stats) {
                    totalJoins = stats.joins || 0;
                    totalLeaves = stats.leaves || 0;
                }
            }

            // Bereken het netto aantal invites (joins min de leaves)
            const netInvites = Math.max(0, totalJoins - totalLeaves);

            const embed = new EmbedBuilder()
                .setTitle('✨ EXCLUSIVE INVITE STATS')
                .setDescription(`✉️ **Overzicht voor ${target.username}**\n\nHieronder staan de officiële netwerkstatistieken van deze gebruiker binnen **${guild.name}**.`)
                .setColor('#00fbff')
                .addFields(
                    { name: '📥 Totaal Gekomen', value: `\`\`\`📥 ${totalJoins} gebruikers\`\`\``, inline: false },
                    { name: '📤 Tota
