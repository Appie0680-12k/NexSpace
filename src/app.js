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

export const invitesCache = new Map();

// We pakken de variabele en loggen de lengte (veilig, zo lekt de token niet maar weten we of hij bestaat!)
const TEST_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,                        
        GatewayIntentBits.GuildMembers,                 
        GatewayIntentBits.GuildMessages,                
        GatewayIntentBits.MessageContent,               
      ],
    });

    this.commands = new Collection();
    // Als TEST_TOKEN leeg is, klapt hij er hier al uit met een duidelijke log
    this.rest = new REST({ version: '10' }).setToken(TEST_TOKEN || "LEEG");
  }

  async start() {
    try {
      console.log('🚀 [START] Systeemcontrole...');
      
      if (!TEST_TOKEN) {
        console.error('❌ [ERROR] Spoorloos: Railway geeft GEEN enkele variabele door aan de code. De token staat leeg in het geheugen!');
      } else {
        console.log(`🔍 [INFO] Er is een token geladen! Lengte van de string is: ${TEST_TOKEN.length} tekens.`);
        if (TEST_TOKEN.includes(' ') || TEST_TOKEN.includes('\r')) {
          console.error('⚠️ [WARNING] Er zitten onzichtbare spaties of enters in je Railway variabele! Maak de variabele helemaal leeg en plak hem opnieuw.');
        }
      }

      this.startWebServer();
      
      try {
        await loadCommands(this);
        console.log(`✅ [COMMANDS] ${this.commands.size} commando's geladen.`);
      } catch (cmdErr) {}
      
      this.once('ready', () => {
        console.log('✅ ONLINE EN READY!');
      });

      console.log('🔐 [LOGIN] Poging tot inloggen bij Discord...');
      await this.login(TEST_TOKEN);
      
    } catch (error) {
      console.error('❌ [CRASH] Inloggen mislukt:', error.message);
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
