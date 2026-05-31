import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ZET HIER JOUW ECHTE DISCORD TOKEN RECHTSTREEKS TUSSEN DE QUOTES:
const HARDCODED_TOKEN = "";

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

    this.token = HARDCODED_TOKEN;
    this.commands = new Collection();
    this.rest = new REST({ version: '10' }).setToken(HARDCODED_TOKEN);
  }

  async start() {
    try {
      console.log('🚀 [START] Bot forceren via hardcoded token...');
      this.startWebServer();
      
      try {
        await loadCommands(this);
        console.log(`✅ [COMMANDS] ${this.commands.size} commando's geladen.`);
      } catch (cmdErr) {}
      
      this.once('ready', async () => {
        console.log('📡 [DISCORD] Verbinding stabiel!');
        try {
          await registerSlashCommands(this, this.config?.bot?.guildId || "1234");
          console.log('✅ ONLINE EN READY!');
        } catch (regErr) {}
      });

      console.log('🔐 [LOGIN] Inloggen bij Discord...');
      await this.login(HARDCODED_TOKEN);
      
    } catch (error) {
      console.error('❌ [CRASH] Bot starten mislukt:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
    app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
  }
}

const bot = new TitanBot();
bot.start();
