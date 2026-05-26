import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('crypto')
        .setDescription('Bekijk de live koers van een crypto coin')
        .addStringOption(option =>
            option.setName('coin')
                .setDescription('Kies de coin')
                .setRequired(true)
                .addChoices(
                    { name: 'Bitcoin (BTC)', value: 'bitcoin' },
                    { name: 'Ethereum (ETH)', value: 'ethereum' },
                    { name: 'Solana (SOL)', value: 'solana' },
                    { name: 'Dogecoin (DOGE)', value: 'dogecoin' },
                    { name: 'Ripple (XRP)', value: 'ripple' }
                )),

    async execute(interaction) {
        const coinId = interaction.options.getString('coin');
        
        // Even netjes laten zien dat de bot nadenkt
        await interaction.deferReply();

        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true&include_market_cap=true`);
            const data = await response.json();
            const coinData = data[coinId];

            if (!coinData) {
                return interaction.editReply({ content: '❌ Kon geen live data ophalen van CoinGecko. Probeer het later opnieuw.' });
            }

            const price = coinData.eur;
            const change = coinData.eur_24h_change || 0;
            const marketCap = coinData.eur_market_cap || 0;

            const changeEmoji = change >= 0 ? '📈' : '📉';
            const embedColor = change >= 0 ? '#2ecc71' : '#e74c3c';

            const embed = new EmbedBuilder()
                .setTitle(`💰 Live Koers: ${coinId.toUpperCase()}`)
                .setColor(embedColor)
                .addFields(
                    { name: 'Huidige Prijs', value: `**€${price.toLocaleString('nl-NL')}**`, inline: true },
                    { name: '24h Verandering', value: `${changeEmoji} \`${change.toFixed(2)}%\``, inline: true },
                    { name: 'Market Cap', value: `€${Math.floor(marketCap).toLocaleString('nl-NL')}`, inline: false }
                )
                .setFooter({ text: 'Data via CoinGecko • NexSpace Premium' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Crypto Command Error:', error);
            return interaction.editReply({ content: '❌ Er ging iets mis bij het uitvoeren van dit commando.' });
        }
    }
};
