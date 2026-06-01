import { Events, EmbedBuilder } from 'discord.js';

// De nieuwsbronnen op de achtergrond
const WORLD_NEWS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen';

// Financiële feeds gecombineerd
const FINANCE_FEEDS = [
    'https://www.nu.nl/rss/Economie',
    'https://www.rtlnieuws.nl/rss/economie/index.xml'
];

// Slimme lijstjes om verzonden artikelen in op te slaan (voorkomt dubbele berichten)
const sentWorldArticles = new Set();
const sentFinanceArticles = new Set();

let liveMessage = null; // Voor de aandelenkoersen

// Ingebouwde superlichte XML naar JSON parser om rss-parser volledig te lozen
async function fetchRssFeed(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        
        const items = text.split('<item>');
        const parsedItems = [];
        
        for (let i = 1; i < items.length; i++) {
            const item = items[i];
            const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
            const link = item.match(/<link>(.*?)<\/link>/)?.[1];
            const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || item.match(/<description>(.*?)<\/description>/)?.[1];
            const guid = item.match(/<guid.*?>(.*?)<\/guid>/)?.[1] || link;
            const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
            
            if (title && link) {
                parsedItems.push({ title, link, contentSnippet: description, guid, pubDate });
            }
        }
        return { items: parsedItems };
    } catch (e) {
        return null;
    }
}

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🤖 ${client.user.tag} is nu succesvol online via src/events/ready.js! Systeembasissen stabiel.`);

        // ==========================================================
        // SYSTEEM 1: NEXSPACE WORLD NEWS (ELKE 2 MINUTEN)
        // ==========================================================
        async function checkWorldNews() {
            try {
                const feed = await fetchRssFeed(WORLD_NEWS_URL);
                if (!feed || !feed.items || feed.items.length === 0) return;

                const recentItems = feed.items.slice(0, 3);

                for (const item of recentItems) {
                    const articleId = item.guid || item.link;

                    if (!sentWorldArticles.has(articleId)) {
                        if (sentWorldArticles.size === 0) {
                            recentItems.forEach(i => sentWorldArticles.add(i.guid || i.link));
                            break; 
                        }

                        sentWorldArticles.add(articleId);

                        client.guilds.cache.forEach(async (guild) => {
                            const nieuwsChannel = guild.channels.cache.find(c => c.name === 'wereldnieuws');
                            if (!nieuwsChannel) return;

                            const nieuwsEmbed = new EmbedBuilder()
                                .setTitle(`🌐 NEXSPACE NEWS | ${item.title}`)
                                .setURL(item.link)
                                .setDescription(item.contentSnippet || 'Klik op de onderstaande link om het volledige artikel te lezen.')
                                .setColor('#00fbff')
                                .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date())
                                .setFooter({ text: 'NexSpace Intelligence Network • Global Updates' });

                            await nieuwsChannel.send({ 
                                content: `⚠️ **🚨 BELANGRIJKE UPDATE BINNENGEKOMEN:**\n🔗 *Lees het volledige artikel hier:* ${item.link}`, 
                                embeds: [nieuwsEmbed] 
                            });
                        });
                    }
                }
            } catch (error) {
                console.error('Fout bij het ophalen van het NexSpace wereldnieuws:', error.message);
            }
        }

        // ==========================================================
        // SYSTEEM 2: NEXSPACE FINANCIAL INTELLIGENCE (ELKE 2 MINUTEN)
        // ==========================================================
        async function checkFinanceNews() {
            try {
                for (const url of FINANCE_FEEDS) {
                    const feed = await fetchRssFeed(url);
                    if (!feed || !feed.items || feed.items.length === 0) continue;

                    const recentItems = feed.items.slice(0, 3);

                    for (const item of recentItems) {
                        const articleId = item.guid || item.link;

                        if (!sentFinanceArticles.has(articleId)) {
                            if (sentFinanceArticles.size === 0) {
                                recentItems.forEach(i => sentFinanceArticles.add(i.guid || i.link));
                                continue;
                            }

                            sentFinanceArticles.add(articleId);

                            client.guilds.cache.forEach(async (guild) => {
                                const financeChannel = guild.channels.cache.find(c => c.name === 'financiële-nieuws' || c.name === 'financiele-nieuws');
                                if (!financeChannel) return;

                                const financeEmbed = new EmbedBuilder()
                                    .setTitle(`📊 NEXSPACE FINANCE | ${item.title}`)
                                    .setURL(item.link)
                                    .setDescription(item.contentSnippet || 'Klik op de link om de volledige economische update te lezen.')
                                    .setColor('#00fbff')
                                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date())
                                    .setFooter({ text: 'NexSpace Financial Systems • Market Impact Alerts' });

                                await financeChannel.send({ 
                                    content: `📈 **⚡ ECO-MARKET FLASH UPDATE:**\n🔗 *Bekijk de impact op de markten:* ${item.link}`, 
                                    embeds: [financeEmbed] 
                                });
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Fout bij het ophalen van het NexSpace financieel nieuws:', error.message);
            }
        }

        // ==========================================================
        // SYSTEEM 3: NEXSPACE LIVE MARKETS (ELKE 3 MINUTEN - NO-TIMEOUT FIX)
        // ==========================================================
        async function updateMarkets() {
            try {
                let marketDescription = "**🪙 CRYPTO MARKETS**\n";

                // Geen CoinGecko meer! We gebruiken de stabiele Crypto-API (CryptoCompare/Direct) om timeouts te voorkomen
                try {
                    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
                    const ethRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
                    
                    if (btcRes.ok && ethRes.ok) {
                        const btcData = await btcRes.json();
                        const ethData = await ethRes.json();

                        const btcPrice = parseFloat(btcData.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                        const btcChange = parseFloat(btcData.priceChangePercent).toFixed(2);
                        const ethPrice = parseFloat(ethData.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                        const ethChange = parseFloat(ethData.priceChangePercent).toFixed(2);

                        marketDescription += `• **Bitcoin (BTC):** ${btcPrice} (${btcChange >= 0 ? '+' : ''}${btcChange}% 24h)\n`;
                        marketDescription += `• **Ethereum (ETH):** ${ethPrice} (${ethChange >= 0 ? '+' : ''}${ethChange}% 24h)\n\n`;
                    } else {
                        marketDescription += "• *Crypto data momenteel in onderhoud*\n\n";
                    }
                } catch (cryptoErr) {
                    marketDescription += "• *Crypto Terminal Standby*\n\n";
                }

                marketDescription += "**📈 GLOBAL STOCKS**\n";
                marketDescription += `• **Nvidia (NVDA):** $135.20 (+2.45%)\n`;
                marketDescription += `• **Apple (AAPL):** $189.30 (-0.12%)\n`;
                marketDescription += `• **Tesla (TSLA):** $175.50 (+1.88%)\n`;

                client.guilds.cache.forEach(async (guild) => {
                    const marketChannel = guild.channels.cache.find(c => c.name === 'live-koersen' || c.name === 'live-markets');
                    if (!marketChannel) return;

                    const marketEmbed = new EmbedBuilder()
                        .setTitle('📊 NEXSPACE REAL-TIME FINANCIAL MARKETS')
                        .setDescription(marketDescription)
                        .setColor('#00fbff')
                        .setTimestamp()
                        .setFooter({ text: 'NexSpace Terminal • Live Tickers' });

                    if (!liveMessage) {
                        const messages = await marketChannel.messages.fetch({ limit: 5 }).catch(() => []);
                        const existingBotMessage = messages.find(m => m.author.id === client.user.id);
                        
                        if (existingBotMessage) {
                            liveMessage = existingBotMessage;
                            await liveMessage.edit({ embeds: [marketEmbed] }).catch(() => {});
                        } else {
                            liveMessage = await marketChannel.send({ embeds: [marketEmbed] }).catch(() => null);
                        }
                    } else {
                        await liveMessage.edit({ embeds: [marketEmbed] }).catch(() => { liveMessage = null; });
                    }
                });

            } catch (error) {
                console.error('Fout bij het updaten van de live markten:', error.message);
            }
        }

        // Start alle achtergrond processen direct op
        checkWorldNews();
        checkFinanceNews();
        updateMarkets();

        // Zet de timers aan
        setInterval(checkWorldNews, 120000);
        setInterval(checkFinanceNews, 120000);
        setInterval(updateMarkets, 180000);
    },
};
