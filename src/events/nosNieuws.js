import Parser from 'rss-parser';

const parser = new Parser();

export default {
    name: 'clientReady',
    once: false,
    async execute(client) {
        console.log('📰 [NOS] Nieuws-feed achtergrondscanner gestart.');
        
        // Loop om elke 5 minuten het nieuws te checken
        setInterval(async () => {
            try {
                const feed = await parser.parseURL('https://feeds.nos.nl/nosnieuwsalgemeen');
                // Hier staat de rest van jouw specifieke NOS doorstuur-code...
            } catch (error) {
                console.error('⚠️ [NOS Feed Error]:', error.message);
            }
        }, 300000); // 5 minuten
    }
};
