```javascript
import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Routes,
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
      console.log('\n🚀 TitanBot herstart met Crash-Schild...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ Geen Discord token gevonden in Railway.');
        process.exit(1);
      }

      /* =========================
         DATABASE (CRASH-VRIJ)
      ========================= */

      console.log('🗄️ Verbinden met database...');
      try {
        // We voeren dit uit met een fail-safe: als de database weigert, crasht de bot niet!
        const dbInstance = await initializeDatabase().catch(err => {
          console.error(`⚠️ Database kon niet direct verbinden: ${err.message}`);
          return null;
        });

        if (dbInstance && dbInstance.db) {
          this.db = dbInstance.db;
          console.log('✅ Database verbinding succesvol.');

          // Voorkom crashes bij onverwachte database disconnects (Postgres error handling)
          if (typeof this.db.on === 'function') {
            this.db.on('error', (err) => {
              console.error('⚠️ [DATABASE FOUT] Verbinding verbroken op de achtergrond:', err.message);
              // We laten de bot gewoon doorlopen, hij herverbindt automatisch wanneer nodig.
            });
          }
        } else {
          console.warn('⚠️ Bot start op ZONDER actieve databaseverbinding (Offline modus).');
        }
      } catch (dbError) {
        console.error(`⚠️ Database fout opgevangen: ${dbError.message}`);
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
        console.log(`✅ ${this.commands.size} commands geladen.`);
      } catch (commandError) {
        console.error(`❌ Commands fout tijdens inladen: ${commandError.message}`);
      }

      /* =========================
         EVENTS LADEN
      ========================= */

      console.log('📅 Events laden...');
      await this.loadEvents();

      /* =========================
         LOGIN & DIRECTE REGISTRATIE (MET LIMIET BESCHERMING)
      ========================= */

      console.log('🔐 Inloggen bij Discord...');

      this.once('ready', async () => {
        console.log(`✅ Bot online als ${this.user.tag}`);
        
        try {
          console.log('⚡ Slash commands synchroniseren...');
          const targetGuildId = '1475577072381460521';
          
          // --- DISCORD 100-COMMAND LIMIT SCHILD ---
          if (this.commands.size > 95) {
            console.warn(`🚨 WAARSCHUWING: Je hebt ${this.commands.size} commando's geladen! Discord weigert registratie boven de 100.`);
            console.warn(`🧹 Automatisch inkorten om crashes te voorkomen...`);
            
            // We behouden alleen de eerste 95 commando's om veilig onder de limiet te blijven
            const prunedCommands = new Collection();
            let count = 0;
            for (const [key, value] of this.commands) {
              if (count < 95) {
                prunedCommands.set(key, value);
                count++;
              } else {
                console.log(`✂️ Overtollig commando genegeerd voor stabiliteit: /${key}`);
              }
            }
            this.commands = prunedCommands;
          }

          // Nu registreren we ze veilig via de handler
          await registerSlashCommands(this, targetGuildId);
          console.log(`✅ Slash commands succesvol geregistreerd voor server: ${targetGuildId}`);
        } catch (registerError) {
          console.error(`⚠️ Slash command registratie fout (Opgevangen): ${registerError.message}`);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error(`❌ Kritieke startup fout: ${err.message}`);
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
          console.error(`❌ Event fout (${file}): ${eventError.message}`);
        }
      }
      console.log(`🎉 ${this.events.size} events geladen.`);
    } catch (err) {
      console.error(`❌ Events loader fout: ${err.message}`);
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
        uptime: `${Math.floor(process.uptime() / 60)} minuten`
      });
    });

    app.listen(PORT, () => {
      console.log(`🌐 Geavanceerde Keep-Alive Webserver actief op poort ${PORT}`);
    });
  }
}

/* =========================================================
   CREATE BOT & CRASH SHIELD (Vangt ALLES op zodat hij online blijft!)
========================================================= */

const bot = new TitanBot();

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [CRASH-SCHILD] Onopgevangen fout (Unhandled Promise Rejection) gedempt:', reason);
});

process.on('uncaughtException', (error, origin) => {
  console.error('🛡️ [CRASH-SCHILD] Kritieke systeemfout opgevangen & genegeerd:', error);
});

bot.start();

```
