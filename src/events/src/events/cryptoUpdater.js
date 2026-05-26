import { Events, EmbedBuilder } from 'discord.js';

let loopStarted = false;

async function getCryptoPrice(coinId) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true`);
        const data = await response.json();
        return data[coinId];
    } catch (e) {
        return null;
    }
}

export default {
    name: Events.ClientReady, // Start zodra de TitanBot template 'ready' is
    once: true,
    async execute(client) {
        if (loopStarted) return;
        loopStarted = true;

        console.log('📊 Crypto Ticker Service is opgestart...');

        // Loop die elke 5 minuten (300000 ms) draait
        setInterval(async () => {
            try {
                const cryptoChannel = client.channels.cache.find(c => c.name === 'crypto-updates');
                if (!cryptoChannel) return; // Kanaal niet gevonden? Doe niks.

                const btc = await getCryptoPrice('bitcoin');
                const eth = await getCryptoPrice('ethereum');
                const sol = await getCryptoPrice('solana');

                if (btc && eth && sol) {
                    const embed = new EmbedBuilder()
                        .setTitle('📊 Live NexSpace Crypto Update')
                        .setColor('#00fbff') // Dezelfde mooie blauwe kleur als je partners menu
                        .addFields(
                            { name: 'Bitcoin (BTC)', value: `€${btc.eur.toLocaleString('nl-NL')} (${btc.eur_24h_change >= 0 ? '+' : ''}${btc.eur_24h_change.toFixed(2)}%)`, inline: false },
                            { name: 'Ethereum (ETH)', value: `€${eth.eur.toLocaleString('nl-NL')} (${eth.eur_24h_change >= 0 ? '+' : ''}${eth.eur_24h_change.toFixed(2)}%)`, inline: false },
                            { name: 'Solana (SOL)', value: `€${sol.eur.toLocaleString('nl-NL')} (${sol.eur_24h_change >= 0 ? '+' : ''}${sol.eur_24h_change.toFixed(2)}%)`, inline: false }
                        )
                        .setFooter({ text: 'NexSpace Ticker • Automatische update' })
                        .setTimestamp();
                    
                    await cryptoChannel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error('Fout in crypto loop:', err);
            }
        }, 300000);
    }
};
