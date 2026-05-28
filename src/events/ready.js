import { Events, EmbedBuilder } from 'discord.js';
import Parser from 'rss-parser';

const parser = new Parser();
const NEWS_RSS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen'; // De nieuwsbron op de achtergrond
let lastGuid = null; // Om dubbel nieuws te voorkomen
let liveMessage = null; // Voor de aandelenkoersen

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // TitanBot opstartmelding
        console.log(`🤖 ${client.user.tag} is nu succesvol online. NexSpace systemen starten op...`);

        // ==========================================================
        // SYSTEM 1: NEXSPACE NEWS NETWORK (ELKE 5 MINUTEN)
        // ==========================================================
        async function checkNieuws() {
            try {
                const feed = await parser.parseURL(NEWS_RSS_URL);
                if (!feed.items || feed.items.length === 0) return;

                const nieuwsteArtikel = feed.items[0];

                // Eerste keer opstarten? Alleen onthouden om spam van oude artikelen te voorkomen
                if (!lastGuid) {
                    lastGuid = nieuwsteArtikel.guid || nieuwsteArtikel.link;
                    return;
                }

                // Als er écht een gloednieuw artikel is
                if (nieuwsteArtikel.guid !== lastGuid && nieuwsteArtikel.link !== lastGuid) {
                    lastGuid = nieuwsteArtikel.guid || nieuwsteArtikel.link;

                    client.guilds.cache.forEach(async (guild) => {
                        const nieuwsChannel = guild.channels.cache.find(c => c.name === 'wereldnieuws');
                        
                        if (nieuwsChannel) {
                            const nieuwsEmbed = new EmbedBuilder()
                                .setTitle(`🌐 NEXSPACE NEWS | ${nieuwsteArtikel.title}`)
                                .setURL(nieuwsteArtikel.link)
                                .setDescription(nieuwsteArtikel.contentSnippet || nieuwsteArtikel.content || 'Klik op de onderstaande link om het volledige artikel te lezen.')
                                .setColor('#00fbff')
                                .setTimestamp(new Date(nieuwsteArtikel.pubDate))
                                .setFooter({ text: 'NexSpace Intelligence Network • Global Updates' });

                            await nieuwsChannel.send({ 
                                content: `⚠️ **🚨 BELANGRIJKE UPDATE BINNENGEKOMEN:**\n🔗 *Lees het volledige artikel hier:* ${nieuwsteArtikel.link}`, 
                                embeds: [nieuwsEmbed] 
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Fout bij het ophalen van het NexSpace nieuws:', error);
            }
        }

        // ==========================================================
        // SYSTEEM 2: NEXSPACE LIVE MARKETS (ELKE 3 MINUTEN)
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

        async function updateMarkets() {
            try {
                let tableRows = [];

                // Crypto data laden
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

                // Aandelen data laden
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

                const marketEmbed = new EmbedBuilder()
                    .setTitle('📊 NEXSPACE INTELLIGENCE | REAL-TIME MARKETS')
                    .setDescription(`Welkom op de NexSpace Trading Terminal. Hieronder vind je de realtime koersen van de belangrijkste crypto's en tech-aandelen.\n\n*Dit schema wordt elke 3 minuten automatisch live bijgewerkt.*\n\n🟢 **Status:** DATAFEED LIVE\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` + tableRows.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'))
                    .setColor('#00fbff')
                    .setTimestamp()
                    .setFooter({ text: 'NexSpace Financial Systems • Live Market Feed' });

                client.guilds.cache.forEach(async (guild) => {
                    const marketChannel = guild.channels.cache.find(c => c.name === 'aandelen-koers');
                    if (!marketChannel) return;

                    if (!liveMessage) {
                        const recentMessages = await marketChannel.messages.fetch({ limit: 10 });
                        const botMsg = recentMessages.find(m => m.author.id === client.user.id);
                        if (botMsg) liveMessage = botMsg;
                    }

                    if (liveMessage) {
                        await liveMessage.edit({ content: null, embeds: [marketEmbed] }).catch(() => { liveMessage = null; });
                    } else {
                        liveMessage = await marketChannel.send({ embeds: [marketEmbed] });
                    }
                });

            } catch (error) {
                console.error('Algemene fout bij markt-update:', error);
            }
        }

        // ==========================================================
        // START DE TIMERS EN EERSTE CHECKS Direct!
        // ==========================================================
        // Start nieuws-systeem
        checkNieuws();
        setInterval(checkNieuws, 5 * 60 * 1000); // Check elke 5 minuten op nieuw nieuws

        // Start koersen-systeem
        updateMarkets();
        setInterval(updateMarkets, 3 * 60 * 1000); // Update schema elke 3 minuten
    }
};
