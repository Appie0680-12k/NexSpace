import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invitesCache = new Map();

// Pak de token direct uit Railway en strip alle onzin
const RAW_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;
const CLEAN_TOKEN = RAW_TOKEN ? RAW_TOKEN.replace(/["']/g, "").trim() : null;
const GUILD_ID = process.env.GUILD_ID || "JOUW_SERVER_ID_HIER"; 

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
    this.rest = new REST({ version: '10' }).setToken(CLEAN_TOKEN);
  }

  async start() {
    try {
      console.log('🚀 [START] TitanBot forceren online...');
      
      if (!CLEAN_TOKEN) {
        console.error('❌ [ERROR] Geen token gevonden in Railway variabelen!');
        process.exit(1);
      }

      // Start direct de webserver voor Railway health check
      this.startWebServer();
      
      console.log('📂 [COMMANDS] Laden van commando\'s...');
      try {
        await loadCommands(this);
        console.log(`✅ [COMMANDS] ${this.commands.size} commando's geladen.`);
      } catch (cmdErr) {
        console.error(`⚠️ [COMMANDS] Fout bij laden commando's: ${cmdErr.message}`);
      }
      
      // Laad VEILIG de events in
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
              } catch (e) {}
          }
      }
      
      this.once('ready', async () => {
        console.log('📡 [DISCORD] Verbinding stabiel. Slash commando\'s pushen...');
        try {
          await registerSlashCommands(this, GUILD_ID);
          console.log('✅ [SUCCESS] ONLINE EN READY! Commando\'s werken nu.');
        } catch (regErr) {
          console.error(`⚠️ [SLASH] Kon commands niet registreren: ${regErr.message}`);
        }
      });

      console.log('🔐 [LOGIN] Inloggen bij Discord...');
      await this.login(CLEAN_TOKEN);
      
    } catch (error) {
      console.error('❌ [CRASH] Bot starten mislukt:', error);
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
    } catch (err) {
      console.error('⚠️ Webserver crash bypassed');
    }
  }
}

const bot = new TitanBot();
bot.start();
