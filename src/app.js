```javascript
// --- CRASH SHIELD DIRECT BOVENAAN (STOPT ELKE RUNTIME CRASH!) ---
process.on('uncaughtException', (error) => {
  console.error('🛡️ [CRASH PROTECTION] Runtime systeemfout gedempt: ' + error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [CRASH PROTECTION] Belofte fout gedempt:', reason);
});

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

const RAW_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;
const CLEAN_TOKEN = RAW_TOKEN ? RAW_TOKEN.replace(/["']/g, '').trim() : null;
const PORT = process.env.PORT || 3000;

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
    this.rest = new REST({ version: '10' }).setToken(CLEAN_TOKEN);
  }

  async start() {
    try {
      console.log('🚀 [TITAN] Startprocedure geactiveerd...');

      if (!CLEAN_TOKEN) {
        console.error('❌ [CONFIG] Geen token gevonden in Railway variabelen.');
        process.exit(1);
      }

      // 1. WEB SERVER DIRECT OPSTARTEN (Zodat Railway de poort open ziet staan)
      this.startWebServer();

      // 2. DATABASE CONNECTIE (FAIL-SAFE - HANGT NOOIT MEER OP!)
      console.log('🗄️ [DATABASE] Verbinden...');
      try {
        const dbInstance = await Promise.race([
          initializeDatabase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connectie duurde te lang')), 5000))
        ]).catch((dbErr) => {
          console.error('⚠️ [DATABASE] Connectie mislukt of time-out, we gaan offline door: ' + dbErr.message);
          return null;
        });

        if (dbInstance && dbInstance.db) {
          this.db = dbInstance.db;
          console.log('✅ [DATABASE] Verbinding succesvol.');
          
          if (typeof this.db.on === 'function') {
            this.db.on('error', (err) => {
              console.error('⚠️ [DATABASE] Fout op de achtergrond: ' + err.message);
            });
          }
        }
      } catch (dbError) {
        console.error('⚠️ [DATABASE] Onverwachte fout tijdens start: ' + dbError.message);
      }

      // 3. COMMANDS INLADEN
      console.log('📂 [COMMANDS] Laden...');
      try {
        await loadCommands(this);
        console.log('✅ [COMMANDS] ' + this.commands.size + ' commando\'s ingeladen.');
      } catch (commandError) {
        console.error('❌ [COMMANDS] Fout tijdens laden: ' + commandError.message);
      }

      // 4. EVENTS INLADEN
      console.log('📅 [EVENTS] Laden...');
      await this.loadEvents();

      // 5. LOGIN BIJ DISCORD
      console.log('🔐 [GATEWAY] Inloggen...');
      this.once('ready', async () => {
        console.log('🟢 [READY] Bot succesvol online als ' + this.user.tag);
        
        try {
          console.log('⚡ [DISCORD] Commando\'s synchroniseren...');
          const targetGuildId = '1475577072381460521';
          await registerSlashCommands(this, targetGuildId);
          console.log('✅ [DISCORD] Synchronisatie voltooid.');
        } catch (registerError) {
          console.error('⚠️ [DISCORD] Fout bij slash command sync: ' + registerError.message);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error('❌ [FATAL] Startup gecrasht: ' + err.message);
      process.exit(1);
    }
  }

  async loadEvents() {
    try {
      const eventsPath = fs.existsSync(path.join(__dirname, 'events'))
        ? path.join(__dirname, 'events')
        : path.join(__dirname, 'src', 'events');

      if (!fs.existsSync(eventsPath)) {
        console.warn('⚠️ [EVENTS] Map niet gevonden.');
        return;
      }

      const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

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
          console.error('❌ [EVENTS] Kon ' + file + ' niet inladen: ' + eventError.message);
        }
      }
      console.log('🎉 [EVENTS] ' + this.events.size + ' events succesvol geladen.');
    } catch (err) {
      console.error('❌ [EVENTS] Fout in loader: ' + err.message);
    }
  }

  startWebServer() {
    try {
      const app = express();
      app.get('/', (req, res) => res.status(200).send('🚀 TitanBot Status: Active!'));
      
      const server = app.listen(PORT, () => {
        console.log('🌐 [WEB] Keep-alive actief op poort ' + PORT);
      });

      server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') {
          console.error('⚠️ [WEB] Webserver error: ' + err.message);
        }
      });
    } catch (err) {
      console.error('⚠️ [WEB] Webserver kon niet starten: ' + err.message);
    }
  }
}

const bot = new TitanBot();
bot.start();

```
