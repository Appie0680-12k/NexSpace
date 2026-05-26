import { Events, EmbedBuilder } from 'discord.js';

let loopStarted = false;

// Lijst met coins die we in het exclusieve schema willen tonen
const coins = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin'];

async function getCryptoData() {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=eur&include_24hr_change=true&include_24hr_vol=true`);
        return await response.json();
    } catch (e) {
        console.error('Fout bij ophalen crypto koersen:', e);
        return null;
    }
}

export default {
    name: Events.ClientReady, // Start zodra de TitanBot 'ready' is
    once: true,
    async execute(client) {
        if (loopStarted) return;
        loopStarted = true;

        console.log('📊 Exclusieve Crypto Ticker Service is opgestart...');

        // Globale variabele om het ID van het schema-bericht te onthouden tijdens deze sessie
        let targetMessage = null;

        // Loop die elke 3 minuten (180000 ms) het schema live bijwerkt
        setInterval(async () => {
            try {
                const cryptoChannel = client.channels.cache.find(c => c.name === 'crypto-updates');
                if (!cryptoChannel) return;

                const data = await getCryptoData();
                if (!data) return;

                // Prachtige exclusieve Embed bouwen
                const embed = new EmbedBuilder()
                    .setTitle('💎 NexSpace Premium Crypto Markets')
                    .setDescription('Dit is het live geüpdatete overzicht van de belangrijkste cryptocurrency koersen.')
                    .setColor('#00fbff') // Dezelfde premium lichtblauwe kleur
                    .setThumbnail(client.guilds.cache.first()?.iconURL() || null)
                    .setTimestamp();

                let marketList = "";

                // Gegevens per coin netjes formatteren
                const coinNames = { bitcoin: 'Bitcoin (BTC)', ethereum: 'Ethereum (ETH)', solana: 'Solana (SOL)', ripple: 'Ripple (XRP)', dogecoin: 'Dogecoin (DOGE)' };
                const coinEmojis = { bitcoin: '🪙', ethereum: '🔷', solana: '☀️', ripple: '💧', dogecoin: '🐕' };

                coins.forEach(coin => {
                    if (data[coin]) {
                        const price = data[coin].eur;
                        const change = data[coin].eur_24h_change || 0;
                        const changeEmoji = change >= 0 ? '📈' : '📉';
                        const plusSign = change >= 0 ? '+' : '';

                        marketList += `${coinEmojis[coin]} **${coinNames[coin]}**\n`;
                        marketList += `└── Prijs: **€${price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}**\n`;
                        marketList += `└── 24h: ${changeEmoji} \`${plusSign}${change.toFixed(2)}%\` \n\n`;
                    }
                });

                embed.addFields({ name: '📊 Actuele Live Koersen', value: marketList });
                embed.setFooter({ text: 'NexSpace Ticker • Automatische Live Update (Elke 3 min)' });

                // Als we het bericht al hebben gezocht of gemaakt in dit kanaal
                if (targetMessage) {
                    try {
                        await targetMessage.edit({ embeds: [embed] });
                    } catch (err) {
                        // Als het bericht handmatig is verwijderd, maken we een nieuwe aan
                        targetMessage = await cryptoChannel.send({ embeds: [embed] });
                    }
                } else {
                    // Haal de laatste 10 berichten op om te kijken of de bot al een schema heeft staan
                    const recentMessages = await cryptoChannel.messages.fetch({ limit: 10 });
                    const botSchemaMsg = recentMessages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === '💎 NexSpace Premium Crypto Markets');

                    if (botSchemaMsg) {
                        targetMessage = botSchemaMsg;
                        await targetMessage.edit({ embeds: [embed] });
                    } else {
                        // Geen bestaand schema gevonden? Stuur een splinternieuwe
                        targetMessage = await cryptoChannel.send({ embeds: [embed] });
                    }
                }

            } catch (err) {
                console.error('Fout tijdens updaten van crypto schema:', err);
            }
        }, 180000); // 3 minuten interval
    }
};
