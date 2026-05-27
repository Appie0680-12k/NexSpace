import { Events, EmbedBuilder } from 'discord.js';

let loopStarted = false;
// Populaire volwassen beleggingen: S&P 500, Tesla, Nvidia, Apple, Goud
const stocks = ['AAPL', 'TSLA', 'NVDA', 'GC=F']; 

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        if (loopStarted) return;
        loopStarted = true;

        console.log('📈 Adult Analytics Service (Stocks & Global News) online...');
        let stockMessage = null;

        // --- STAP 2: AANDELEN TICKER LOOP (Elke 5 minuten) ---
        setInterval(async () => {
            try {
                const stockChannel = client.channels.cache.find(c => c.name === 'aandelen-koers');
                if (!stockChannel) return;

                // We halen gratis data op via een open finance API
                const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${stocks.join(',')}`);
                const result = await response.json();
                const quoteData = result.quoteResponse.result;

                if (!quoteData) return;

                const embed = new EmbedBuilder()
                    .setTitle('📊 NexSpace Traditional Markets & ETF Tracker')
                    .setDescription('Live koersen van de traditionele aandelenmarkten, grondstoffen en macro-economie.')
                    .setColor('#2c3e50') // Chique, volwassen donkergrijze kleur
                    .setTimestamp();

                let stockList = "";
                const stockNames = { AAPL: 'Apple Inc. (AAPL)', TSLA: 'Tesla Motors (TSLA)', NVDA: 'Nvidia Corp. (NVDA)', 'GC=F': 'Goud (Gold Ounce)' };
                const stockEmojis = { AAPL: '🍎', TSLA: '⚡', NVDA: '🧠', 'GC=F': '🏆' };

                quoteData.forEach(ticker => {
                    const symbol = ticker.symbol;
                    const price = ticker.regularMarketPrice;
                    const change = ticker.regularMarketChangePercent || 0;
                    const changeEmoji = change >= 0 ? '🟩' : '🟥';

                    stockList += `${stockEmojis[symbol] || '📈'} **${stockNames[symbol] || symbol}**\n`;
                    stockList += `├── Koers: **$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n`;
                    stockList += `└── 24h Trend: ${changeEmoji} \`${change >= 0 ? '+' : ''}${change.toFixed(2)}%\`\n\n`;
                });

                embed.addFields({ name: '📈 Actuele Beurskoersen (USD)', value: stockList });
                embed.setFooter({ text: 'NexSpace Traditional Finance • Updates elke 5 min' });

                if (stockMessage) {
                    try { await stockMessage.edit({ embeds: [embed] }); } catch { stockMessage = await stockChannel.send({ embeds: [embed] }); }
                } else {
                    const recent = await stockChannel.messages.fetch({ limit: 10 });
                    const found = recent.find(m => m.author.id === client.user.id && m.embeds[0]?.title === '📊 NexSpace Traditional Markets & ETF Tracker');
                    if (found) { stockMessage = found; await stockMessage.edit({ embeds: [embed] }); }
                    else { stockMessage = await stockChannel.send({ embeds: [embed] }); }
                }

            } catch (err) {
                console.error('Fout bij ophalen aandelenkoersen:', err);
            }
        }, 300000);


        // --- STAP 1: LIVE WERELDNIEUWS (Elk uur een grote update) ---
        setInterval(async () => {
            try {
                const newsChannel = client.channels.cache.find(c => c.name === 'wereldnieuws');
                if (!newsChannel) return;

                // We halen het laatste economie/tech nieuws op uit Nederland/Wereld
                const response = await fetch(`https://newsapi.org/v2/top-headlines?category=business&language=nl&apiKey=${process.env.NEWS_API_KEY}`);
                const data = await response.json();

                if (!data.articles || data.articles.length === 0) return;

                const newsEmbed = new EmbedBuilder()
                    .setTitle('📰 NexSpace Global Business Daily')
                    .setDescription('De belangrijkste macro-economische koppen en het wereldnieuws van dit moment.')
                    .setColor('#7f8c8d')
                    .setTimestamp();

                // Pak de top 5 belangrijkste artikelen
                const topArticles = data.articles.slice(0, 5);
                topArticles.forEach((article, index) => {
                    if (article.title && article.title !== '[Removed]') {
                        newsEmbed.addFields({
                            name: `${index + 1}. ${article.title}`,
                            value: article.description || 'Klik op de link voor het volledige artikel.',
                            inline: false
                        });
                    }
                });

                newsEmbed.setFooter({ text: 'NexSpace Media • Elk uur verspeid' });
                
                // In `#wereldnieuws` sturen we elk uur een nieuw overzicht zodat men erover kan discussiëren!
                await newsChannel.send({ embeds: [newsEmbed] });

            } catch (error) {
                console.error('Nieuws feed error:', error);
            }
        }, 3600000); // 3600000 ms = 1 uur
    }
};
