import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './utils/database.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invitesCache = new Map();

// Strict clean van de token uit je Railway variabelen
const RAW_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;
const CLEAN_TOKEN = RAW_TOKEN ? RAW_TOKEN.replace(/["']/g, "").trim() : null;
const GUILD_ID = process.env.GUILD_ID || "1234"; 

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,                        
        GatewayIntentBits.GuildMembers,                 
        GatewayIntentBits.GuildInvites,                 
        GatewayIntentBits.GuildMessages,                
        GatewayIntentBits.MessageContent,               
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
      console.log('🚀 [START] TitanBot startvolgorde initialiseren...');
      
      if (!CLEAN_TOKEN) {
        console.error('❌ [ERROR] Geen token gevonden in Railway variabelen!');
        process.exit(1);
      }

      console.log('🗄️ [DATABASE] Verbinden met database...');
      try {
        const dbInstance = await initializeDatabase();
        this.db = dbInstance.db;
        console.log('✅ [DATABASE] Verbinding succesvol tot stand gebracht.');
      } catch (dbErr) {
        console.error(`⚠️ [DATABASE] Bypass geactiveerd wegens fout: ${dbErr.message}`);
      }

      this.startWebServer();
      
      console.log('📂 [COMMANDS] Laden van commando\'s...');
      try {
        await loadCommands(this);
        console.log(`✅ [COMMANDS] ${this.commands.size} commando's succesvol geladen.`);
      } catch (cmdErr) {
        console.error(`⚠️ [COMMANDS] Fout bij inladen: ${cmdErr.message}`);
      }
      
      console.log('📅 [EVENTS] Handlers en events koppelen...');
      const eventsPath = path.join(__dirname, 'src', 'events');
      if (fs.existsSync(eventsPath)) {
          const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
          for (const file of eventFiles) {
              try {
                  const filePath = path.join(eventsPath, file);
                  const { default: event } = await import(`file://${filePath}`);
                  if (event && event.name) {
                      this.on(event.name, (...args) => event.execute(...args, this));
                  }
              } catch (e) {
                  console.error(`⚠️ [EVENTS] Kon event ${file} niet linken.`);
              }
          }
      }
      
      this.once('ready', async () => {
        console.log('📡 [DISCORD] Gateway geopend. Slash commando\'s registreren...');
        try {
          await registerSlashCommands(this, GUILD_ID);
          console.log('   Commands gesynchroniseerd met Discord API.');
        } catch (regErr) {
          console.error(`⚠️ [SLASH] Synchronisatie mislukt: ${regErr.message}`);
        }
        console.log('🚀 ONLINE EN VOLLEDIG OPERATIONEEL ✅');
      });

      console.log('🔐 [LOGIN] Inloggen bij Discord gateway...');
      await this.login(CLEAN_TOKEN);
      
    } catch (error) {
      console.error('❌ [CRASH] Fatale fout tijdens opstarten:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    try {
      const app = express();
      app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
      const port = Number(process.env.PORT || 3000);
      app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 [WEB] Health server actief op poort ${port}`);
      });
    } catch (err) {}
  }
}

const bot = new TitanBot();
bot.start();
