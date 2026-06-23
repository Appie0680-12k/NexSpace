import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Routes, // Essentieel voor directe REST registratie van slash commands
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
        GatewayIntentBits.DirectMessages, // Zorgt dat de bot DM's kan ontvangen
      ],
      partials: [
        Partials.Channel, // Zorgt dat messageCreate afvuurt in DM kanalen
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
         COMMANDS LADEN
      ========================= */

      console.log('📂 Commands laden...');

      try {
        await loadCommands(this);
        console.log(
          `✅ ${this.commands.size} commands geladen uit de mappen.`
        );
      } catch (commandError) {
        console.error(
          `❌ Commands laden fout: ${commandError.message}`
        );
      }

      /* =========================
         EVENTS LADEN
      ========================= */

      console.log('📅 Events laden...');
      await this.loadEvents();

      /* =========================
         LOGIN & DIRECT REGISTREREN
      ========================= */

      console.log('🔐 Inloggen bij Discord...');
      
      // Zodra de bot succesvol verbinding heeft, forceren we de registratie
      this.once('ready', async () => {
        console.log(`✅ Bot succesvol ingelogd als ${this.user.tag}`);

        try {
          console.log('⚡ [REST-DIRECT] Slash commands geforceerd registreren...');
          const targetGuildId = '1475577072381460521';
          
          if (this.commands.size === 0) {
            console.warn('⚠️ Waarschuwing: Er zijn 0 commando\'s geladen in het geheugen!');
            return;
          }

          // Zet alle commando data om naar JSON formaat voor Discord API
          const commandsData = this.commands.map(cmd => cmd.data.toJSON());

          // 1. Direct pushen naar jouw specifieke NexSpace Server (Directe update!)
          console.log(`📡 Pushen naar server: ${targetGuildId}...`);
          await this.rest.put(
            Routes.applicationGuildCommands(this.user.id, targetGuildId),
            { body: commandsData }
          );

          // 2. Direct globaal pushen (Wereldwijde back-up)
          console.log('📡 Wereldwijd (globaal) pushen...');
          await this.rest.put(
            Routes.applicationCommands(this.user.id),
            { body: commandsData }
          );

          console.log(`🎉 [REST-DIRECT] Alle ${this.commands.size} slash commands zijn succesvol live gezet op server én globaal!`);
        } catch (registerError) {
          console.error(`⚠️ Kritieke registratie fout: ${registerError.message}`);
          console.error(registerError);
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
      const eventsPath = fs.existsSync(path.join(__dirname, 'events'))
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
          const filePath = path.join(eventsPath, file);
          const eventModule = await import(pathToFileURL(filePath).href);
          const event = eventModule.default || eventModule;

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

    // Hoofdpagina: Stuurt een actieve response naar Uptime Services
    app.get('/', (req, res) => {
      res.status(200).send('🚀 TitanBot Status: Operationeel en 24/7 Online via Keep-Alive!');
    });

    // Uitgebreide Gezondheidscheck voor monitoring tools
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
   (Vangt fouten op zodat de bot NOOIT crasht of offline gaat)
========================================================= */

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRASH] Onopgevangen fout (Unhandled Promise Rejection):', reason);
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
