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
      console.log('\n🚀 [TITAN] Startprocedure geactiveerd...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ [CONFIG] Geen Discord token gevonden in Railway variabelen.');
        process.exit(1);
      }

      /* =========================
         DATABASE (FAIL-SAFE)
      ========================= */

      console.log('🗄️ [DATABASE] Verbinden...');
      try {
        const dbInstance = await initializeDatabase().catch((dbErr) => {
          console.error('⚠️ [DATABASE] Directe verbinding mislukt, we gaan door: ' + dbErr.message);
          return null;
        });

        if (dbInstance && dbInstance.db) {
          this.db = dbInstance.db;
          console.log('✅ [DATABASE] Verbinding succesvol tot stand gebracht.');
        }
      } catch (dbError) {
        console.error('⚠️ [DATABASE] Onverwachte fout opgevangen: ' + dbError.message);
      }

      /* =========================
         WEB SERVER
      ========================= */

      this.startWebServer();

      /* =========================
         COMMANDS LADEN
      ========================= */

      console.log('📂 [COMMANDS] Laden...');
      try {
        await loadCommands(this);
        console.log('✅ [COMMANDS] ' + this.commands.size + ' commando\'s succesvol geladen.');
      } catch (commandError) {
        console.error('❌ [COMMANDS] Fout bij inladen: ' + commandError.message);
      }

      /* =========================
         EVENTS
      ========================= */

      console.log('📅 [EVENTS] Laden...');
      await this.loadEvents();

      /* =========================
         LOGIN & SYNCHRONISATIE
      ========================= */

      console.log('🔐 [GATEWAY] Inloggen bij Discord...');

      this.once('ready', async () => {
        console.log('🟢 [READY] Bot is succesvol online als ' + this.user.tag);
        
        try {
          console.log('⚡ [DISCORD] Slash commando\'s synchroniseren...');
          const targetGuildId = '1475577072381460521';
          
          await registerSlashCommands(this, targetGuildId);
          console.log('✅ [DISCORD] Registratieproces succesvol afgerond.');
        } catch (registerError) {
          console.error('⚠️ [DISCORD] Registratiefout opgevangen: ' + registerError.message);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error('❌ [FATAL] Systeem kon niet starten: ' + err.message);
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
        console.warn('⚠️ [EVENTS] Map niet gevonden.');
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
            this.once(event.name, (...args) =>
              event.execute(...args, this)
            );
          } else {
            this.on(event.name, (...args) =>
              event.execute(...args, this)
            );
          }

          this.events.set(event.name, event);
        } catch (eventError) {
          console.error('❌ [EVENTS] Fout bij laden van ' + file + ': ' + eventError.message);
        }
      }
      console.log('🎉 [EVENTS] ' + this.events.size + ' events geladen.');
    } catch (err) {
      console.error('❌ [EVENTS] Fout in loader: ' + err.message);
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
      console.log('🌐 [WEB] Status webserver actief op poort ' + PORT);
    });
  }
}

/* =========================================================
   CREATE BOT & CRASH SHIELD
========================================================= */

const bot = new TitanBot();

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [CRASH PROTECTION] Belangrijke fout gedempt:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🛡️ [CRASH PROTECTION] Systeemfout genegeerd:', error.message);
});

bot.start();

```
