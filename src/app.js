```javascript
import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
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
      console.log('\n🚀 TitanBot herstart op de meest stabiele manier...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ Geen Discord token gevonden in Railway variabelen.');
        process.exit(1);
      }

      /* =========================
         DATABASE (FAIL-SAFE)
      ========================= */

      console.log('🗄️ Verbinden met database...');
      try {
        const dbInstance = await initializeDatabase().catch((dbErr) => {
          console.error('⚠️ Database kon niet direct verbinden, we gaan door zonder db: ' + dbErr.message);
          return null;
        });

        if (dbInstance && dbInstance.db) {
          this.db = dbInstance.db;
          console.log('✅ Database verbinding succesvol.');
        }
      } catch (dbError) {
        console.error('⚠️ databasefout opgevangen: ' + dbError.message);
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
        console.log('✅ ' + this.commands.size + ' commands succesvol ingeladen.');
      } catch (commandError) {
        console.error('❌ Fout bij laden commands: ' + commandError.message);
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
        console.log('✅ Bot online als ' + this.user.tag);
        
        try {
          console.log('⚡ Slash commando\'s registreren bij Discord...');
          const targetGuildId = '1475577072381460521';
          
          await registerSlashCommands(this, targetGuildId);
          console.log('✅ Registratieproces afgerond.');
        } catch (registerError) {
          console.error('⚠️ Registratiefout gedempt: ' + registerError.message);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error('❌ Kritieke startup fout: ' + err.message);
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
        console.warn('⚠️ Geen events map gevonden.');
        return;
      }

      const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith('.js'));

      for (const file of eventFiles) {
        try {
          const filePath = path.join(eventsPath, file);
          const eventModule = await import(pathToFileURL(filePath).href);
          const event = eventModule.default || eventModule;

          if (!event?.name || !event?.execute) continue;

          if (event.once) {
            this.once(event.name, (...args) => event.execute(...args, this));
          } else {
            this.on(event.name, (...args) => event.execute(...args, this));
          }

          this.events.set(event.name, event);
        } catch (eventError) {
          console.error('❌ Event fout (' + file + '): ' + eventError.message);
        }
      }
      console.log('🎉 ' + this.events.size + ' events geladen.');
    } catch (err) {
      console.error('❌ Events loader fout: ' + err.message);
    }
  }

  /* =========================================================
     WEB SERVER
  ========================================================= */

  startWebServer() {
    const app = express();

    app.get('/', (req, res) => {
      res.status(200).send('🚀 TitanBot Status: Operationeel!');
    });

    app.listen(PORT, () => {
      console.log('🌐 Webserver actief op poort ' + PORT);
    });
  }
}

/* =========================================================
   CREATE BOT & CRASH SHIELD (Voorkomt crashes door database timeouts!)
========================================================= */

const bot = new TitanBot();

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [CRASH PROTECTION] Onopgevangen fout gedempt:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🛡️ [CRASH PROTECTION] Systeemfout genegeerd:', error.message);
});

bot.start();

```
