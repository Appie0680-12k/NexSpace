import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger, startupLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invitesCache = new Map();

// Pak DIRECT de token uit Railway variabelen, hoe hij ook genoemd is
const REAL_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN || config.bot?.token;

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,                        
        GatewayIntentBits.GuildMembers,                 
        GatewayIntentBits.GuildInvites,                 
        GatewayIntentBits.GuildMessages,                
        GatewayIntentBits.GuildMessageReactions,        
        GatewayIntentBits.MessageContent,               
        GatewayIntentBits.GuildVoiceStates,             
        GatewayIntentBits.GuildBans,                    
      ],
    });

    this.config = config;
    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();
    this.db = null;
    this.rest = new REST({ version: '10' }).setToken(REAL_TOKEN);
  }

  async start() {
    try {
      startupLog('Starting TitanBot...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      startupLog('Initializing database...');
      try {
        const dbInstance = await initializeDatabase();
        this.db = dbInstance.db;
      } catch (dbErr) {
        logger.error('Database bypass...');
      }
      
      this.startWebServer();
      
      startupLog('Loading commands...');
      try {
        await loadCommands(this);
      } catch (cmdErr) {
        logger.error(`Bypassed command error: ${cmdErr.message}`);
      }
      
      // VEILIGE EVENT LOADER
      const eventsPath = path.join(__dirname, 'src', 'events');
      if (fs.existsSync(eventsPath)) {
          const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
          for (const file of eventFiles) {
              try {
                  const filePath = path.join(eventsPath, file);
                  const { default: event } = await import(`file://${filePath}`);
                  if (event && event.name) {
                      if (event.once) {
                          this.once(event.name, (...args) => event.execute(...args, this));
                      } else {
                          this.on(event.name, (...args) => event.execute(...args, this));
                      }
                  }
              } catch (eventError) {}
          }
      }
      
      this.once('clientReady', async () => {
        startupLog('Scanning invites...');
        this.guilds.cache.forEach(async (guild) => {
          try {
            const firstInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(firstInvites.map((inv) => [inv.code, inv.uses])));
          } catch (err) {}
        });

        startupLog('Registering slash commands...');
        try {
          await registerSlashCommands(this, this.config.bot?.guildId);
          startupLog('✅ Slash commands succesvol geregistreerd!');
        } catch (regErr) {
          logger.error(`Registratie mislukt: ${regErr.message}`);
        }
      });

      startupLog('Logging into Discord...');
      await this.login(REAL_TOKEN);
      startupLog('ONLINE ✅');
      
      this.setupCronJobs();
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
    app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
  }

  setupCronJobs() {
    cron.schedule('0 0 * * *', () => checkBirthdays(this));
    cron.schedule('*/1 * * * *', () => checkGiveaways(this));
  }
}

const bot = new TitanBot();
bot.start();
