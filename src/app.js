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

// Slimme lijstjes om verzonden artikelen in op te slaan
const sentWorldArticles = new Set();
const sentFinanceArticles = new Set();

let liveMessage = null;

// Ingebouwde XML parser met extra headers tegen blokkades
async function fetchRssFeed(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
        if (!response || !response.ok) return null;

        const text = await response.text().catch(() => '');
        if (!text) return null;

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
                    contentSnippet: description || '',
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

// Functie die checkt of een artikel voldoet aan onze belangrijke trefwoorden
function isBelangrijkNieuws(title, description) {
    const volledigeTekst = `${title.toLowerCase()} ${description.toLowerCase()}`;
    return FILTER_KEYWORDS.some(keyword => volledigeTekst.includes(keyword));
}

export default {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(
            `🤖 ${client.user.tag} is nu succesvol online via src/events/ready.js!`
        );
        client.user.setPresence({
    activities: [
        {
            name: 'Gemaakt door Appie0680',
            type: ActivityType.Listening
        }
    ],
    status: 'online'
});

        // ==========================================================
        // SYSTEEM 1: WERELDNIEUWS (GEFILTERD)
        // ==========================================================
        async function checkWorldNews() {
            try {
                const feed = await fetchRssFeed(WORLD_NEWS_URL);
                if (!feed || !feed.items || feed.items.length === 0) return;

                const recentItems = feed.items.slice(0, 5); // Iets grotere hap nemen om gefilterd nieuws te spotten

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

                        // 🔥 Check of het artikel gaat over Breaking, Oorlog of het WK
                        if (!isBelangrijkNieuws(item.title, item.contentSnippet)) {
                            continue; // Sla dit artikel over als het geen belangrijk trefwoord bevat
                        }

                        for (const [guildId, guild] of client.guilds.cache) {
                            try {
                                const nieuwsChannel = guild.channels.cache.find(
                                    c => c.name === '┃🌍・wereldnieuws' || c.name === 'wereldnieuws'
                                );
                                if (!nieuwsChannel) continue;

                                const embed = new EmbedBuilder()
                                    .setTitle(`🚨 ${item.title}`)
                                    .setURL(item.link)
                                    .setDescription(
                                        item.contentSnippet ||
                                        'Klik op de link om het artikel te lezen.'
                                    )
                                    .setColor('#FF0000') // Rood voor urgent/belangrijk nieuws
                                    .setTimestamp(
                                        item.pubDate ? new Date(item.pubDate) : new Date()
                                    );

                                await nieuwsChannel.send({
                                    content: `🔗 ${item.link}`,
                                    embeds: [embed]
                                }).catch(() => null);
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
                                recentItems.forEach(i =>
                                    sentFinanceArticles.add(i.guid || i.link)
                                );
                                continue;
                            }

                            sentFinanceArticles.add(articleId);

                            for (const [guildId, guild] of client.guilds.cache) {
                                try {
                                    const financeChannel = guild.channels.cache.find(
                                        c =>
                                            c.name === '┃💰・financiële-nieuws' ||
                                            c.name === '┃💰・financiele-nieuws' ||
                                            c.name === 'financiële-nieuws' ||
                                            c.name === 'financiele-nieuws'
                                    );
                                    if (!financeChannel) continue;

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
                    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
                    const ethRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);

                    if (btcRes && ethRes && btcRes.ok && ethRes.ok) {
                        const btcData = await btcRes.json().catch(() => null);
                        const ethData = await ethRes.json().catch(() => null);

                        if (btcData && ethData) {
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
                            marketDescription += '• Crypto data parsing failed\n\n';
                        }
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

                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        const marketChannel = guild.channels.cache.find(
                            c => c.name === 'live-koersen' || c.name === 'live-markets' || c.name === 'aandelen-koers' || c.name === 'aandelen-koer'
                        );
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
                            await liveMessage.edit({ embeds: [embed] }).catch(() => {
                                liveMessage = null;
                            });
                        }
                    } catch (err) {}
                }
            } catch (err) {
                console.error('Markets error:', err.message);
            }
        }

        // BIJ OPSTARTEN
        setTimeout(() => {
            checkWorldNews();
            checkFinanceNews();
            updateMarkets();

            setInterval(checkWorldNews, 120000);
            setInterval(checkFinanceNews, 120000);
            setInterval(updateMarkets, 180000);
        }, 5000);
    }
};

En dit in app.js

import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Routes, // Toegevoegd om de cache direct bij Discord te kunnen overschrijven
} from 'discord.js';

import { REST } from '@discordjs/rest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { initializeDatabase } from './utils/database.js';
import {
  loadCommands,
  registerCommands as registerSlashCommands,
} from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invitesCache = new Map();

/* =========================================================
   ENV CONFIG
========================================================= */

const RAW_TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.BOT_TOKEN ||
  process.env.TOKEN;

const CLEAN_TOKEN = RAW_TOKEN
  ? RAW_TOKEN.replace(/["']/g, '').trim()
  : null;

const GUILD_ID = process.env.GUILD_ID || null;
const PORT = process.env.PORT || 3000;

/* =========================================================
   TITAN BOT CLASS
========================================================= */

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
      ],
    });

    this.token = CLEAN_TOKEN;

    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();

    this.db = null;

    this.rest = new REST({ version: '10' }).setToken(
      CLEAN_TOKEN
    );
  }

  /* =========================================================
     START BOT
  ========================================================= */

  async start() {
    try {
      console.log('\n🚀 TitanBot wordt gestart...\n');

      /* =========================
         TOKEN CHECK
      ========================= */

      if (!CLEAN_TOKEN) {
        console.error(
          '❌ Geen Discord token gevonden in Railway variables.'
        );
        process.exit(1);
      }

      console.log('✅ Token gevonden.');

      /* =========================
         DATABASE
      ========================= */

      console.log('🗄️ Verbinden met database...');

      try {
        const dbInstance = await initializeDatabase();

        this.db = dbInstance.db;

        console.log(
          '✅ Database verbinding succesvol.'
        );
      } catch (dbError) {
        console.error(
          `⚠️ Database fout: ${dbError.message}`
        );
      }

      /* =========================
         WEB SERVER
      ========================= */

      this.startWebServer();

      /* =========================
         COMMANDS
      ========================= */

      console.log('📂 Commands laden...');

      try {
        await loadCommands(this);

        console.log(
          `✅ ${this.commands.size} commands geladen.`
        );
      } catch (commandError) {
        console.error(
          `❌ Commands fout: ${commandError.message}`
        );
      }

      /* =========================
         EVENTS
      ========================= */

      console.log('📅 Events laden...');

      await this.loadEvents();

      /* =========================
         LOGIN & SYNCHRONISATIE
      ========================= */

      console.log('🔐 Inloggen bij Discord...');

      this.once('ready', async () => {
        console.log(`✅ Bot online als ${this.user.tag}`);
        
        try {
          console.log('⚡ Slash commands wereldwijd (globaal) registreren...');
          
          // Haal de data op van alle geladen commando's en zet ze om naar JSON
          const commandsData = this.commands.map(cmd => cmd.data.toJSON());

          // Push ze direct globaal naar Discord (omzeilt server-id cache problemen)
          await this.rest.put(
            Routes.applicationCommands(this.user.id),
            { body: commandsData }
          );

          console.log('✅ Slash commando cache succesvol wereldwijd vernieuwd!');
        } catch (registerError) {
          console.error(`⚠️ Slash command registratie fout: ${registerError.message}`);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error(
        `❌ Kritieke startup fout: ${err.message}`
      );
      console.error(err);
      process.exit(1);
    }
  }

  /* =========================================================
     LOAD EVENTS
  ========================================================= */

  async loadEvents() {
    try {
      const eventsPath = fs.existsSync(
        path.join(__dirname, 'events')
      )
        ? path.join(__dirname, 'events')
        : path.join(__dirname, 'src', 'events');

      if (!fs.existsSync(eventsPath)) {
        console.warn(
          '⚠️ Geen events map gevonden.'
        );
        return;
      }

      const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith('.js'));

      if (!eventFiles.length) {
        console.warn(
          '⚠️ Geen event bestanden gevonden.'
        );
        return;
      }

      for (const file of eventFiles) {
        try {
          const filePath = path.join(
            eventsPath,
            file
          );

          const eventModule = await import(
            pathToFileURL(filePath).href
          );

          const event =
            eventModule.default || eventModule;

          if (!event?.name || !event?.execute) {
            console.warn(
              `⚠️ Ongeldig event bestand: ${file}`
            );
            continue;
          }

          if (event.once) {
            this.once(event.name, (...args) =>
              event.execute(...args, this)
            );
          } else {
            this.on(event.name, (...args) =>
              event.execute(...args, this)
            );
          }

          this.events.set(event.name, event);

          console.log(
            `✅ Event geladen: ${event.name}`
          );
        } catch (eventError) {
          console.error(
            `❌ Event fout (${file}): ${eventError.message}`
          );
        }
      }

      console.log(
        `🎉 ${this.events.size} events geladen.`
      );
    } catch (err) {
      console.error(
        `❌ Events loader fout: ${err.message}`
      );
    }
  }

  /* =========================================================
     WEB SERVER (GEOPTIMALISEERD VOOR 24/7 ONLINE STATUS)
  ========================================================= */

  startWebServer() {
    const app = express();

    app.get('/', (req, res) => {
      res.status(200).send('🚀 TitanBot Status: Operationeel en 24/7 Online via Keep-Alive!');
    });

    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'online',
        bot: this.user?.tag || 'opstarten...',
        uptime: `${Math.floor(process.uptime() / 60)} minuten`,
        ping: this.ws.ping ? `${Math.round(this.ws.ping)}ms` : 'Verbinden met Discord...'
      });
    });

    app.listen(PORT, () => {
      console.log(
        `🌐 Geavanceerde Keep-Alive Webserver actief op poort ${PORT}`
      );
    });
  }
}

/* =========================================================
   CREATE BOT
========================================================= */

const bot = new TitanBot();

/* =========================================================
   GEADVANCEERD CRASH PROTECTION SYSTEM
========================================================= */

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRASH] Onopgevangen fout:', reason);
});

process.on('uncaughtException', (error, origin) => {
  console.error('⚠️ [ANTI-CRASH] Kritieke systeemfout opgevangen:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Bot handmatig afgesloten.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Railway shutdown ontvangen.');
  process.exit(0);
});

/* =========================================================
   START BOT
========================================================= */

bot.start();