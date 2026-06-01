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
                    { name: 'Bitcoin (BTC)', value: 'BTCEUR' },
                    { name: 'Ethereum (ETH)', value: 'ETHEUR' },
                    { name: 'Solana (SOL)', value: 'SOLEUR' },
                    { name: 'Dogecoin (DOGE)', value: 'DOGEEUR' },
                    { name: 'Ripple (XRP)', value: 'XRPEUR' }
                )),

    async execute(interaction) {
        const symbol = interaction.options.getString('coin');
        
        await interaction.deferReply();

        try {
            // We halen de 24-uurs ticker data op van Binance (werkt perfect op Railway)
            const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
            
            if (!response.ok) {
                return interaction.editReply({ content: '❌ Kon geen live data ophalen van de koers. Probeer het later opnieuw.' });
            }

            const data = await response.json();

            const price = parseFloat(data.lastPrice);
            const change = parseFloat(data.priceChangePercent) || 0;
            const high = parseFloat(data.highPrice);
            const low = parseFloat(data.lowPrice);

            const changeEmoji = change >= 0 ? '📈' : '📉';
            const embedColor = change >= 0 ? '#2ecc71' : '#e74c3c';
            
            // Haal de nette naam op voor de titel
            const coinName = symbol.replace('EUR', '');

            const embed = new EmbedBuilder()
                .setTitle(`💰 Live Koers: ${coinName}`)
                .setColor(embedColor)
                .addFields(
                    { name: 'Huidige Prijs', value: `**€${price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}**`, inline: true },
                    { name: '24h Verandering', value: `${changeEmoji} \`${change.toFixed(2)}%\``, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true }, // Leeg veld voor strakke uitlijning
                    { name: '24h Hoogste', value: `€${high.toLocaleString('nl-NL')}`, inline: true },
                    { name: '24h Laagste', value: `€${low.toLocaleString('nl-NL')}`, inline: true }
                )
                .setFooter({ text: 'Data via Binance • NexSpace Premium' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Crypto Command Error:', error);
            return interaction.editReply({ content: '❌ Er ging iets mis bij het ophalen van de crypto koers.' });
        }
    }
};
