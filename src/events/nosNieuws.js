import { Events, EmbedBuilder } from 'discord.js';
import Parser from 'rss-parser';

const parser = new Parser();
const NEWS_RSS_URL = 'https://feeds.nos.nl/nosnieuwsalgemeen'; // We gebruiken de feed op de achtergrond
let lastGuid = null;

export default {
    name: Events.ClientReady, // Start zodra de bot online komt
    once: true,
    async execute(client) {
        console.log('📡 NexSpace News Network is succesvol geactiveerd!');

        // Direct controleren bij opstarten, daarna elke 5 minuten
        checkNieuws(client);
        setInterval(() => checkNieuws(client), 5 * 60 * 1000);
    }
};

async function checkNieuws(client) {
    try {
        const feed = await parser.parseURL(NEWS_RSS_URL);
        if (!feed.items || feed.items.length === 0) return;

        const nieuwsteArtikel = feed.items[0];

        if (!lastGuid) {
            lastGuid = nieuwsteArtikel.guid || nieuwsteArtikel.link;
            return;
        }

        if (nieuwsteArtikel.guid !== lastGuid && nieuwsteArtikel.link !== lastGuid) {
            lastGuid = nieuwsteArtikel.guid || nieuwsteArtikel.link;

            client.guilds.cache.forEach(async (guild) => {
                const nieuwsChannel = guild.channels.cache.find(c => c.name === 'wereldnieuws');
                
                if (nieuwsChannel) {
                    // We bouwen een hele dikke, exclusieve embed in jouw serverstijl
                    const nieuwsEmbed = new EmbedBuilder()
                        .setTitle(`🌐 NEXSPACE NEWS | ${nieuwsteArtikel.title}`)
                        .setURL(nieuwsteArtikel.link) // Link naar het officiële artikel achter de titel
                        .setDescription(nieuwsteArtikel.contentSnippet || nieuwsteArtikel.content || 'Klik op de onderstaande link om het volledige artikel te lezen.')
                        .setColor('#00fbff') // De herkenbare NexSpace Cyan/Neon blauwe kleur!
                        .setTimestamp(new Date(nieuwsteArtikel.pubDate))
                        .setFooter({ text: 'NexSpace Intelligence Network • Global Updates' });

                    // Bericht versturen in het kanaal
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
