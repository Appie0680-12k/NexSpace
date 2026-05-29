import { Events, EmbedBuilder } from 'discord.js';
import Parser from 'rss-parser';

const parser = new Parser();

// De nieuwsbronnen op de achtergrond
const WORLD_NEWS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen';

// Meerdere financiële feeds gecombineerd voor maximale updates en activiteit!
const FINANCE_FEEDS = [
    'https://www.nu.nl/rss/Economie',
    'https://www.rtlnieuws.nl/rss/economie/index.xml'
];

// Slimme lijstjes om verzonden artikelen in op te slaan (voorkomt dubbele berichten)
const sentWorldArticles = new Set();
const sentFinanceArticles = new Set();

let liveMessage = null; // Voor de aandelenkoersen

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🤖 ${client.user.tag} is nu succesvol online via src/events/ready.js! NexSpace systemen starten op...`);

        // ==========================================================
        // SYSTEEM 1: NEXSPACE WORLD NEWS (ELKE 2 MINUTEN)
        // ==========================================================
        async function checkWorldNews() {
            try {
                const feed = await parser.parseURL(WORLD_NEWS_URL).catch(() => null);
                if (!feed || !feed.items || feed.items.length === 0) return;

                // We kijken naar de top 3 nieuwste artikelen
                const recentItems = feed.items.slice(0, 3);

                for (const item of recentItems) {
                    const articleId = item.guid || item.link;

                    // Als we dit artikel deze sessie nog niet hebben gestuurd, sturen we hem DIRECT!
                    if (!sentWorldArticles.has(articleId)) {
                        
                        // Eerste keer opstarten? Vul het geheugen met de huidige top 3 zodat hij niet direct spamt, 
                        // behalve als de lijst leeg is (dan zetten we hem erin voor de volgende ronde)
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
                                .setDescription(item.contentSnippet || item.content || 'Klik op de onderstaande link om het volledige artikel te lezen.')
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
                console.error('Fout bij het ophalen van het NexSpace wereldnieuws:', error);
            }
        }

        // ==========================================================
        // SYSTEEM 2: NEXSPACE FINANCIAL INTELLIGENCE (ELKE 2 MINUTEN - MEER BRONNEN)
        // ==========================================================
        async function checkFinanceNews() {
            try {
                for (const url of FINANCE_FEEDS) {
                    const feed = await parser.parseURL(url).catch(() => null);
                    if (!feed || !feed.items || feed.items.length === 0) continue;

                    // Pak de 3 nieuwste artikelen per beursfeed
                    const recentItems = feed.items.slice(0, 3);

                    for (const item of recentItems) {
                        const articleId = item.guid || item.link;

                        if (!sentFinanceArticles.has(articleId)) {
                            
                            // Eerste opstart-vulling om massaspam te voorkomen
                            if (sentFinanceArticles.size === 0) {
                                // Vul het geheugen vast met de allernieuwste items van deze feed
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
                                    .setDescription(item.contentSnippet || item.content || 'Klik op de link om de volledige economische update te lezen.')
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
                console.error('Fout bij het ophalen van het NexSpace financieel nieuws:', error);
            }
        }

        // ==========================================================
        // SYSTEEM 3: NEXSPACE LIVE MARKETS (ELKE 3 MINUTEN)
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
        // START DE CHECKS EN GEOPTIMALISEERDE TIMERS DIRECT
        // ==========================================================
        // 1. Wereldnieuws (Elke 2 minuten)
        checkWorldNews();
        setInterval(checkWorldNews, 2 * 60 * 1000);

        // 2. Uitgebreid Financieel Nieuws (Elke 2 minuten)
        checkFinanceNews();
        setInterval(checkFinanceNews, 2 * 60 * 1000);

        // 3. Koersen live-ticker (Elke 3 minuten)
        updateMarkets();
        setInterval(updateMarkets, 3 * 60 * 1000);
    }
};
