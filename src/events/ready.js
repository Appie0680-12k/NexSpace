import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Dit is de standaard TitanBot melding die je al had
        console.log(`🤖 ${client.user.tag} is nu succesvol online en klaar voor gebruik!`);

        // ==========================================================
        // NEXSPACE AUTOMATISCH KOERSEN SYSTEEM (ELKE 3 MINUTEN)
        // ==========================================================
        const CRYPTO_TICKERS = [
            { name: '🪙 Bitcoin (BTC)', id: 'bitcoin' },
            { name: '💎 Ethereum (ETH)', id: 'ethereum' }
        ];

        const STOCK_TICKERS = [
            { name: '🟢 Nvidia (NVDA)', symbol: 'NVDA' },
            { name: '🍏 Apple (AAPL)', symbol: 'AAPL' },
            { name: '⚡ Tesla (TSLA)', symbol: 'TSLA' }
        ];

        let liveMessage = null;

        // Functie die de koersen ophaalt en de tabel bijwerkt
        async function updateMarkets() {
            try {
                let tableRows = [];

                // 1. Crypto data ophalen
                try {
                    const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`);
                    const cryptoData = await cryptoRes.json();

                    for (const ticker of CRYPTO_TICKERS) {
                        const data = cryptoData[ticker.id];
                        if (data) {
                            const price = data.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const change = data.usd_24h_change.toFixed(2);
                            const isPositive = parseFloat(change) >= 0;
                            const trendEmoji = isPositive ? '🟩 📈' : '🟥 📉';
                            const prefix = isPositive ? '+' : '';

                            tableRows.push(`${trendEmoji} **${ticker.name}**\n\`$${price}\` | \`${prefix}${change}%\``);
                        }
                    }
                } catch (err) {
                    console.error('Kon crypto data niet laden:', err);
                }

                // 2. Aandelen data ophalen
                for (const stock of STOCK_TICKERS) {
                    try {
                        const stockRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=1d`);
                        const stockData = await stockRes.json();
                        
                        const meta = stockData.chart.result[0].meta;
                        const price = meta.regularMarketPrice.toFixed(2);
                        const prevClose = meta.previousClose;
                        const changePercent = (((meta.regularMarketPrice - prevClose) / prevClose) * 100).toFixed(2);
                        
                        const isPositive = parseFloat(changePercent) >= 0;
                        const trendEmoji = isPositive ? '🟩 📈' : '🟥 📉';
                        const prefix = isPositive ? '+' : '';

                        tableRows.push(`${trendEmoji} **${stock.name}**\n\`$${price}\` | \`${prefix}${changePercent}%\``);
                    } catch (err) {
                        console.error(`Kon aandeel data voor ${stock.symbol} niet laden:`, err);
                    }
                }

                if (tableRows.length === 0) return;

                // Bouw het premium NexSpace Live Markten Schema
                const marketEmbed = new EmbedBuilder()
                    .setTitle('📊 NEXSPACE INTELLIGENCE | REAL-TIME MARKETS')
                    .setDescription(`Welkom op de NexSpace Trading Terminal. Hieronder vind je de realtime koersen van de belangrijkste crypto's en tech-aandelen.\n\n*Dit schema wordt elke 3 minuten automatisch live bijgewerkt.*\n\n🟢 **Status:** DATAFEED LIVE\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` + tableRows.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'))
                    .setColor('#00fbff') // De bekende cyan neon NexSpace kleur
                    .setTimestamp()
                    .setFooter({ text: 'NexSpace Financial Systems • Live Market Feed' });

                // Zoek naar het kanaal '#aandelen-koers' in alle servers
                client.guilds.cache.forEach(async (guild) => {
                    const marketChannel = guild.channels.cache.find(c => c.name === 'aandelen-koers');
                    if (!marketChannel) return;

                    // Als we het bericht nog niet in het geheugen hebben, check de chatgeschiedenis
                    if (!liveMessage) {
                        const recentMessages = await marketChannel.messages.fetch({ limit: 10 });
                        const botMsg = recentMessages.find(m => m.author.id === client.user.id);
                        if (botMsg) liveMessage = botMsg;
                    }

                    if (liveMessage) {
                        // Pas het bestaande schema geruisloos aan (geen spam!)
                        await liveMessage.edit({ content: null, embeds: [marketEmbed] }).catch(() => { liveMessage = null; });
                    } else {
                        // Stuur het allereerste schema als er nog niks staat
                        liveMessage = await marketChannel.send({ embeds: [marketEmbed] });
                    }
                });

            } catch (error) {
                console.error('Algemene fout bij markt-update:', error);
            }
        }

        // Voer de update direct uit zodra de bot opstart
        updateMarkets();

        // Herhaal dit proces daarna strak om de 3 minuten (3 * 60 * 1000 milliseconden)
        setInterval(updateMarkets, 3 * 60 * 1000);
    }
};
