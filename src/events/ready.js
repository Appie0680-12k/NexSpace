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
        // SYSTEEM 0: PREMIUM INVITE CACHE INLADEN (CRUCIAL VOOR TRACKER)
        // ==========================================================
        client.invitesCache = new Map();

        // Loop door alle servers en sla alle huidige stand van de invites op in de cache
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                const invites = await guild.invites.fetch();
                client.invitesCache.set(guild.id, new Map(invites.map((inv) => [inv.code, inv.uses])));
                console.log(`📁 [INVITE-CACHE] ${invites.size} invites succesvol ingeladen voor server: ${guild.name}`);
            } catch (err) {
                console.log(`⚠️ [INVITE-CACHE] Kon invites niet laden voor server ${guild.name}: ${err.message}`);
            }
        }

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
        async function updateMarkets() {
            try {
                let marketDescription = "**🪙 CRYPTO MARKETS**\n";

                // Live Crypto data ophalen van CoinGecko
                try {
                    const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`);
                    const cryptoData = await cryptoRes.json();
                    
                    if (cryptoData.bitcoin && cryptoData.ethereum) {
                        const btcPrice = cryptoData.bitcoin.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                        const btcChange = cryptoData.bitcoin.usd_24h_change.toFixed(2);
                        const ethPrice = cryptoData.ethereum.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                        const ethChange = cryptoData.ethereum.usd_24h_change.toFixed(2);

                        marketDescription += `• **Bitcoin (BTC):** ${btcPrice} (${btcChange}% 24h)\n`;
                        marketDescription += `• **Ethereum (ETH):** ${ethPrice} (${ethChange}% 24h)\n\n`;
                    } else {
                        marketDescription += "• *Crypto data tijdelijk niet beschikbaar*\n\n";
                    }
                } catch (cryptoErr) {
                    marketDescription += "• *Crypto API Error*\n\n";
                }

                marketDescription += "**📈 GLOBAL STOCKS**\n";
                // Simulatie/Placeholder voor Stocks (Finnhub/Yahoo vereist API key, dit voorkomt crashes)
                marketDescription += `• **Nvidia (NVDA):** $135.20 (+2.45%)\n`;
                marketDescription += `• **Apple (AAPL):** $189.30 (-0.12%)\n`;
                marketDescription += `• **Tesla (TSLA):** $175.50 (+1.88%)\n`;

                // Update het embed bericht in het juiste kanaal
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
                        // Zoek naar een bestaand bericht om te bewerken, anders sturen we een nieuwe
                        const messages = await marketChannel.messages.fetch({ limit: 5 }).catch(() => []);
                        const existingBotMessage = messages.find(m => m.author.id === client.user.id);
                        
                        if (existingBotMessage) {
                            liveMessage = existingBotMessage;
                            await liveMessage.edit({ embeds: [marketEmbed] });
                        } else {
                            liveMessage = await marketChannel.send({ embeds: [marketEmbed] });
                        }
                    } else {
                        await liveMessage.edit({ embeds: [marketEmbed] }).catch(() => { liveMessage = null; });
                    }
                });

            } catch (error) {
                console.error('Fout bij het updaten van de live markten:', error);
            }
        }

        // Start alle achtergrond processen direct op
        checkWorldNews();
        checkFinanceNews();
        updateMarkets();

        // Zet de timers aan (elke 2 of 3 minuten)
        setInterval(checkWorldNews, 120000);
        setInterval(checkFinanceNews, 120000);
        setInterval(updateMarkets, 180000);
    },
};
