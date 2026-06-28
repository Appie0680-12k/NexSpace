```javascript
import { Events, EmbedBuilder, ActivityType } from 'discord.js';

// De nieuwsbronnen op de achtergrond
const WORLD_NEWS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen';

// Financiële feeds gecombineerd
const FINANCE_FEEDS = [
    'https://www.nu.nl/rss/Economie',
    'https://www.rtlnieuws.nl/rss/economie/index.xml'
];

// --- 🎯 TREFWOORDEN FILTER VOOR BELANGRIJK NIEUWS ---
const FILTER_KEYWORDS = [
    // Breaking / Alarm
    'breaking', 'spoed', 'alarm', 'cruciaal', 'code rood', 'grote ramp', 'aanslag', 'getroffen',
    // Oorlog / Conflicten
    'oorlog', 'conflict', 'invasie', 'raket', 'bombardement', 'leger', 'militaire', 'escalatie', 'front', 'oorlogsvoering',
    // WK / Groot Sportnieuws
    'wk', 'wereldkampioenschap', 'fifa', 'knvb', 'oranje', 'wk-ploeg', 'wk-selectie', 'kwalificatie', 'finale'
];

const sentWorldArticles = new Set();
const sentFinanceArticles = new Set();
let liveMessage = null;

// Ingebouwde XML parser met extra headers tegen blokkades (Crash-veilig)
async function fetchRssFeed(url) {
    try {
        const response = await fetch(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(5000) // Timeout na 5 seconden om haperen te voorkomen
        }).catch(() => null);

        if (!response || !response.ok) return null;

        const text = await response.text().catch(() => '');
        if (!text) return null;

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
                parsedItems.push({ 
                    title: title.trim(), 
                    link: link.trim(), 
                    contentSnippet: description ? description.trim() : '', 
                    guid: guid ? guid.trim() : link.trim(), 
                    pubDate 
                });
            }
        }
        return { items: parsedItems };
    } catch (e) {
        return null;
    }
}

function isBelangrijkNieuws(title, description) {
    if (!title) return false;
    const desc = description || '';
    const volledigeTekst = (title + ' ' + desc).toLowerCase();
    return FILTER_KEYWORDS.some(keyword => volledigeTekst.includes(keyword));
}

export default {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`🟢 [READY] ${client.user.tag} is nu succesvol online via ready.js!`);
        
        // Status instellen
        try {
            client.user.setPresence({
                activities: [{ name: 'Gemaakt door Appie0680', type: ActivityType.Listening }],
                status: 'online'
            });
        } catch (err) {
            console.error('⚠️ Kon status niet instellen:', err.message);
        }

        // ==========================================================
        // SYSTEEM 1: WERELDNIEUWS (GEFILTERD)
        // ==========================================================
        async function checkWorldNews() {
            try {
                const feed = await fetchRssFeed(WORLD_NEWS_URL);
                if (!feed || !feed.items || feed.items.length === 0) return;
                const recentItems = feed.items.slice(0, 5);

                for (const item of recentItems) {
                    const articleId = item.guid || item.link;
                    if (!sentWorldArticles.has(articleId)) {
                        if (sentWorldArticles.size === 0) {
                            recentItems.forEach(i => sentWorldArticles.add(i.guid || i.link));
                            break;
                        }
                        sentWorldArticles.add(articleId);

                        if (!isBelangrijkNieuws(item.title, item.contentSnippet)) continue;

                        for (const [guildId, guild] of client.guilds.cache) {
                            try {
                                const nieuwsChannel = guild.channels.cache.find(c => c.name === '┃🌍・wereldnieuws' || c.name === 'wereldnieuws');
                                if (!nieuwsChannel) continue;

                                const embed = new EmbedBuilder()
                                    .setTitle(`🚨 ${item.title}`)
                                    .setURL(item.link)
                                    .setDescription(item.contentSnippet || 'Klik op de link om het artikel te lezen.')
                                    .setColor('#FF0000')
                                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                                await nieuwsChannel.send({ content: `🔗 ${item.link}`, embeds: [embed] }).catch(() => null);
                            } catch (err) {}
                        }
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

                            for (const [guildId, guild] of client.guilds.cache) {
                                try {
                                    const financeChannel = guild.channels.cache.find(c =>
                                        c.name === '┃💰・financiële-nieuws' || c.name === '┃💰・financiele-nieuws' ||
                                        c.name === 'financiële-nieuws' || c.name === 'financiele-nieuws'
                                    );
                                    if (!financeChannel) continue;

                                    const embed = new EmbedBuilder()
                                        .setTitle(`📊 ${item.title}`)
                                        .setURL(item.link)
                                        .setDescription(item.contentSnippet || 'Klik op de link om het artikel te lezen.')
                                        .setColor('#00fbff')
                                        .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                                    await financeChannel.send({ content: `🔗 ${item.link}`, embeds: [embed] }).catch(() => null);
                                } catch (err) {}
                            }
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
                    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { 
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: AbortSignal.timeout(3000)
                    }).catch(() => null);
                    
                    const ethRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { 
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: AbortSignal.timeout(3000)
                    }).catch(() => null);

                    if (btcRes && ethRes && btcRes.ok && ethRes.ok) {
                        const btcData = await btcRes.json().catch(() => null);
                        const ethData = await ethRes.json().catch(() => null);

                        if (btcData && ethData) {
                            const btcPrice = parseFloat(btcData.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                            const ethPrice = parseFloat(ethData.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                            marketDescription += `• BTC: ${btcPrice}\n• ETH: ${ethPrice}\n\n`;
                        } else { marketDescription += '• Crypto data parsing failed\n\n'; }
                    } else { marketDescription += '• Crypto data unavailable\n\n'; }
                } catch { marketDescription += '• Crypto API offline\n\n'; }

                marketDescription += '**📈 STOCKS**\n• Nvidia: $135.20\n• Apple: $189.30\n• Tesla: $175.50\n';

                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        const marketChannel = guild.channels.cache.find(c => c.name === 'live-koersen' || c.name === 'live-markets' || c.name === 'aandelen-koers' || c.name === 'aandelen-koer');
                        if (!marketChannel) continue;

                        const embed = new EmbedBuilder()
                            .setTitle('📊 LIVE FINANCIAL MARKETS')
                            .setDescription(marketDescription)
                            .setColor('#00fbff')
                            .setTimestamp();

                        if (!liveMessage) {
                            const messages = await marketChannel.messages.fetch({ limit: 5 }).catch(() => null);
                            const existingBotMessage = messages && messages.size > 0 ? messages.find(m => m.author.id === client.user.id) : null;

                            if (existingBotMessage) {
                                liveMessage = existingBotMessage;
                                await liveMessage.edit({ embeds: [embed] }).catch(() => { liveMessage = null; });
                            } else {
                                liveMessage = await marketChannel.send({ embeds: [embed] }).catch(() => { liveMessage = null; });
                            }
                        } else {
                            await liveMessage.edit({ embeds: [embed] }).catch(() => { liveMessage = null; });
                        }
                    } catch (err) {}
                }
            } catch (err) {
                console.error('Markets error:', err.message);
            }
        }

        // BIJ OPSTARTEN (Wacht 5 seconden na start)
        setTimeout(() => {
            checkWorldNews().catch(() => null);
            checkFinanceNews().catch(() => null);
            updateMarkets().catch(() => null);

            setInterval(() => checkWorldNews().catch(() => null), 120000);
            setInterval(() => checkFinanceNews().catch(() => null), 120000);
            setInterval(() => updateMarkets().catch(() => null), 180000);
        }, 5000);
    }
};

```
