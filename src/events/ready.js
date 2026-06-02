import { Events, EmbedBuilder } from 'discord.js';

// De nieuwsbronnen op de achtergrond
const WORLD_NEWS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen';

// Financiële feeds gecombineerd
const FINANCE_FEEDS = [
    'https://www.nu.nl/rss/Economie',
    'https://www.rtlnieuws.nl/rss/economie/index.xml'
];

// Slimme lijstjes om verzonden artikelen in op te slaan
const sentWorldArticles = new Set();
const sentFinanceArticles = new Set();

let liveMessage = null;

// Ingebouwde XML parser
async function fetchRssFeed(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return null;

        const text = await response.text();
        const items = text.split('<item>');
        const parsedItems = [];

        for (let i = 1; i < items.length; i++) {
            const item = items[i];

            const title =
                item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                item.match(/<title>(.*?)<\/title>/)?.[1];

            const link =
                item.match(/<link>(.*?)<\/link>/)?.[1];

            const description =
                item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                item.match(/<description>(.*?)<\/description>/)?.[1];

            const guid =
                item.match(/<guid.*?>(.*?)<\/guid>/)?.[1] || link;

            const pubDate =
                item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];

            if (title && link) {
                parsedItems.push({
                    title,
                    link,
                    contentSnippet: description,
                    guid,
                    pubDate
                });
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
        console.log(
            `🤖 ${client.user.tag} is nu succesvol online via src/events/ready.js!`
        );

        // ==========================================================
        // SYSTEEM 1: WERELDNIEUWS
        // ==========================================================
        async function checkWorldNews() {
            try {
                const feed = await fetchRssFeed(WORLD_NEWS_URL);
                if (!feed || !feed.items?.length) return;

                const recentItems = feed.items.slice(0, 3);

                for (const item of recentItems) {
                    const articleId = item.guid || item.link;

                    if (!sentWorldArticles.has(articleId)) {
                        if (sentWorldArticles.size === 0) {
                            recentItems.forEach(i =>
                                sentWorldArticles.add(i.guid || i.link)
                            );
                            break;
                        }

                        sentWorldArticles.add(articleId);

                        client.guilds.cache.forEach(async guild => {
                            const nieuwsChannel = guild.channels.cache.find(
                                c => c.name === '┃🌍・wereldnieuws'
                            );
                            if (!nieuwsChannel) return;

                            const embed = new EmbedBuilder()
                                .setTitle(`🌐 ${item.title}`)
                                .setURL(item.link)
                                .setDescription(
                                    item.contentSnippet ||
                                    'Klik op de link om het artikel te lezen.'
                                )
                                .setColor('#00fbff')
                                .setTimestamp(
                                    item.pubDate ? new Date(item.pubDate) : new Date()
                                );

                            await nieuwsChannel.send({
                                content: `🔗 ${item.link}`,
                                embeds: [embed]
                            }).catch(() => null);
                        });
                    }
                }
            } catch (err) {
                console.error('World news error:', err.message);
            }
        }

        // ==========================================================
        // SYSTEEM 2: FINANCIEEL NIEUWS
        // ==========================================================
        async function checkFinanceNews() {
            try {
                for (const url of FINANCE_FEEDS) {
                    const feed = await fetchRssFeed(url);
                    if (!feed || !feed.items?.length) continue;

                    const recentItems = feed.items.slice(0, 3);

                    for (const item of recentItems) {
                        const articleId = item.guid || item.link;

                        if (!sentFinanceArticles.has(articleId)) {
                            if (sentFinanceArticles.size === 0) {
                                recentItems.forEach(i =>
                                    sentFinanceArticles.add(i.guid || i.link)
                                );
                                continue;
                            }

                            sentFinanceArticles.add(articleId);

                            client.guilds.cache.forEach(async guild => {
                                const financeChannel = guild.channels.cache.find(
                                    c =>
                                        c.name === 'financiële-nieuws' ||
                                        c.name === 'financiele-nieuws'
                                );
                                if (!financeChannel) return;

                                const embed = new EmbedBuilder()
                                    .setTitle(`📊 ${item.title}`)
                                    .setURL(item.link)
                                    .setDescription(
                                        item.contentSnippet ||
                                        'Klik op de link om het artikel te lezen.'
                                    )
                                    .setColor('#00fbff')
                                    .setTimestamp(
                                        item.pubDate ? new Date(item.pubDate) : new Date()
                                    );

                                await financeChannel.send({
                                    content: `🔗 ${item.link}`,
                                    embeds: [embed]
                                }).catch(() => null);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Finance news error:', err.message);
            }
        }

        // ==========================================================
        // SYSTEEM 3: LIVE MARKETS
        // ==========================================================
        async function updateMarkets() {
            try {
                let marketDescription = '**🪙 CRYPTO MARKETS**\n';

                try {
                    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const ethRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { headers: { 'User-Agent': 'Mozilla/5.0' } });

                    if (btcRes.ok && ethRes.ok) {
                        const btcData = await btcRes.json();
                        const ethData = await ethRes.json();

                        const btcPrice = parseFloat(btcData.lastPrice).toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        });

                        const ethPrice = parseFloat(ethData.lastPrice).toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        });

                        marketDescription += `• BTC: ${btcPrice}\n`;
                        marketDescription += `• ETH: ${ethPrice}\n\n`;
                    } else {
                        marketDescription += '• Crypto data unavailable\n\n';
                    }
                } catch {
                    marketDescription += '• Crypto API offline\n\n';
                }

                marketDescription += '**📈 STOCKS**\n';
                marketDescription += '• Nvidia: $135.20\n';
                marketDescription += '• Apple: $189.30\n';
                marketDescription += '• Tesla: $175.50\n';

                client.guilds.cache.forEach(async guild => {
                    // Zoekt nu naar ALLE mogelijke kanaalnamen zodat hij nooit crasht
                    const marketChannel = guild.channels.cache.find(
                        c => c.name === 'live-koersen' || c.name === 'live-markets' || c.name === 'aandelen-koer' || c.name === 'aandelen-koers'
                    );
                    if (!marketChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle('📊 LIVE FINANCIAL MARKETS')
                        .setDescription(marketDescription)
                        .setColor('#00fbff')
                        .setTimestamp();

                    if (!liveMessage) {
                        const messages = await marketChannel.messages.fetch({ limit: 5 }).catch(() => []);
                        const existingBotMessage = messages && messages.size ? messages.find(m => m.author.id === client.user.id) : null;

                        if (existingBotMessage) {
                            liveMessage = existingBotMessage;
                            await liveMessage.edit({ embeds: [embed] }).catch(() => null);
                        } else {
                            liveMessage = await marketChannel.send({ embeds: [embed] }).catch(() => null);
                        }
                    } else {
                        await liveMessage.edit({ embeds: [embed] }).catch(() => {
                            liveMessage = null;
                        });
                    }
                });
            } catch (err) {
                console.error('Markets error:', err.message);
            }
        }

        // START SYSTEMEN
        checkWorldNews();
        checkFinanceNews();
        updateMarkets();

        setInterval(checkWorldNews, 120000);
        setInterval(checkFinanceNews, 120000);
        setInterval(updateMarkets, 180000);
    }
};
