import { Events, EmbedBuilder } from 'discord.js';

let loopStarted = false;
const coins = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin'];

// Leuke crypto quotes voor de exclusieve beheerders sfeer
const cryptoQuotes = [
    "💎 HODL alsof je leven ervan afhangt. NexSpace Elite.",
    "📈 Buy the dip, cry in the rip.",
    "🚀 We gaan niet naar de maan, we gaan naar NexSpace.",
    "🐋 Pas op voor de whales, vaar je eigen koers.",
    "📉 Geen paniek bij rode cijfers, dat is gewoon korting!",
    "🧠 Investeer alleen wat je kunt missen om te gokken."
];

async function getDetailedCryptoData() {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=eur&include_24hr_change=true&include_24hr_vol=true`);
        return await response.json();
    } catch (e) {
        console.error('Fout bij ophalen crypto koersen:', e);
        return null;
    }
}

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        if (loopStarted) return;
        loopStarted = true;

        console.log('📊 Dubbel Crypto Systeem (Normaal + Exclusief) opgestart...');
        
        let msgUpdates = null; // Onthoudt het bericht in #crypto-updates
        let msgKoers = null;   // Onthoudt het bericht in #crypto-koers

        // Loop die elke 3 minuten (180000 ms) beide schema's live bijwerkt
        setInterval(async () => {
            try {
                const data = await getDetailedCryptoData();
                if (!data) return;

                const coinNames = { bitcoin: 'Bitcoin (BTC)', ethereum: 'Ethereum (ETH)', solana: 'Solana (SOL)', ripple: 'Ripple (XRP)', dogecoin: 'Dogecoin (DOGE)' };
                const coinEmojis = { bitcoin: '🪙', ethereum: '🔷', solana: '☀️', ripple: '💧', dogecoin: '🐕' };

                // ==========================================
                // SCHEMA 1: #crypto-updates (NORMALE VERSIE)
                // ==========================================
                const updatesChannel = client.channels.cache.find(c => c.name === '┃🪙・crypto-updates');
                if (updatesChannel) {
                    const embedUpdates = new EmbedBuilder()
                        .setTitle('💎 NexSpace Premium Crypto Markets')
                        .setDescription('Dit is het live geüpdatete overzicht van de belangrijkste cryptocurrency koersen.')
                        .setColor('#00fbff') // Vaste premium lichtblauwe kleur
                        .setThumbnail(client.guilds.cache.first()?.iconURL() || null)
                        .setTimestamp();

                    let updatesList = "";
                    coins.forEach(coin => {
                        if (data[coin]) {
                            const price = data[coin].eur;
                            const change = data[coin].eur_24h_change || 0;
                            const changeEmoji = change >= 0 ? '📈' : '📉';
                            const plusSign = change >= 0 ? '+' : '';

                            updatesList += `${coinEmojis[coin]} **${coinNames[coin]}**\n`;
                            updatesList += `├── Prijs: **€${price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}**\n`;
                            updatesList += `└── 24h: ${changeEmoji} \`${plusSign}${change.toFixed(2)}%\` \n\n`;
                        }
                    });

                    embedUpdates.addFields({ name: '📊 Actuele Live Koersen', value: updatesList });
                    embedUpdates.setFooter({ text: 'NexSpace Ticker • Automatische Update (Elke 3 min)' });

                    // Anti-Spam Check voor #crypto-updates
                    if (msgUpdates) {
                        try { await msgUpdates.edit({ embeds: [embedUpdates] }); } catch { msgUpdates = await updatesChannel.send({ embeds: [embedUpdates] }); }
                    } else {
                        const recent = await updatesChannel.messages.fetch({ limit: 10 });
                        const found = recent.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '💎 NexSpace Premium Crypto Markets');
                        if (found) { msgUpdates = found; await msgUpdates.edit({ embeds: [embedUpdates] }); }
                        else { msgUpdates = await updatesChannel.send({ embeds: [embedUpdates] }); }
                    }
                }

                // ==========================================
                // SCHEMA 2: #crypto-koers (EXCLUSIEVE VERSIE)
                // ==========================================
                const koersChannel = client.channels.cache.find(c => c.name === 'crypto-koers');
                if (koersChannel) {
                    const btcChange = data['bitcoin']?.eur_24h_change || 0;
                    let marketSentiment = "😐 NEUTRAAL";
                    let sentimentColor = "#f1c40f";
                    
                    if (btcChange > 3) { marketSentiment = "🚀 EXTREME GREED (Bullish)"; sentimentColor = "#2ecc71"; }
                    else if (btcChange > 0) { marketSentiment = "📈 GREED (Gezond)"; sentimentColor = "#2ecc71"; }
                    else if (btcChange < -3) { marketSentiment = "🚨 EXTREME FEAR (Koop de Dip!)"; sentimentColor = "#e74c3c"; }
                    else if (btcChange < -0) { marketSentiment = "📉 FEAR (Lichte Correctie)"; sentimentColor = "#e74c3c"; }

                    const randomQuote = cryptoQuotes[Math.floor(Math.random() * cryptoQuotes.length)];

                    const embedKoers = new EmbedBuilder()
                        .setTitle('🦅 NexSpace Premium Crypto Analytics')
                        .setDescription('Welkom in het exclusieve dashboard voor beheerders. Dit overzicht bevat geavanceerde market data.')
                        .setColor(sentimentColor) // Kleur verandert mee met de markt!
                        .setThumbnail(client.guilds.cache.first()?.iconURL() || null)
                        .addFields({ name: '🌐 Algemeen Marktsentiment', value: `\`\`\`📊 Status: ${marketSentiment}\`\`\``, inline: false })
                        .setTimestamp();

                    let koersList = "";
                    coins.forEach(coin => {
                        if (data[coin]) {
                            const price = data[coin].eur;
                            const change = data[coin].eur_24h_change || 0;
                            const volume = data[coin].eur_24h_vol || 0;
                            const changeEmoji = change >= 0 ? '🟩' : '🟥';
                            const plusSign = change >= 0 ? '+' : '';

                            koersList += `${coinEmojis[coin]} **${coinNames[coin]}**\n`;
                            koersList += `├── Koers: **€${price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n`;
                            koersList += `├── Trend: ${changeEmoji} \`${plusSign}${change.toFixed(2)}%\`\n`;
                            koersList += `└── 24h Vol: *€${Math.floor(volume / 1000000).toLocaleString('nl-NL')}M*\n\n`;
                        }
                    });

                    embedKoers.addFields(
                        { name: '📈 Live Marktprijzen & Volumes', value: koersList },
                        { name: '💡 Beheerders Wijsheid', value: `_${randomQuote}_` }
                    );
                    embedKoers.setFooter({ text: 'NexSpace Analytics • Management Console' });

                    // Anti-Spam Check voor #crypto-koers
                    if (msgKoers) {
                        try { await msgKoers.edit({ embeds: [embedKoers] }); } catch { msgKoers = await koersChannel.send({ embeds: [embedKoers] }); }
                    } else {
                        const recent = await koersChannel.messages.fetch({ limit: 10 });
                        const found = recent.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '🦅 NexSpace Premium Crypto Analytics');
                        if (found) { msgKoers = found; await msgKoers.edit({ embeds: [embedKoers] }); }
                        else { msgKoers = await koersChannel.send({ embeds: [embedKoers] }); }
                    }
                }

            } catch (err) {
                console.error('Fout tijdens updaten van dubbele crypto schema\'s:', err);
            }
        }, 180000);
    }
};
