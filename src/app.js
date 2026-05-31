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
import { getGuildConfig } from './services/guildConfig.js';
import { getServerCounters, saveServerCounters, updateCounter } from './services/serverstatsService.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map om alle actieve invites in op te slaan (geëxporteerd zodat je events erbij kunnen!)
export const invitesCache = new Map();

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
    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
  }

  async start() {
    try {
      startupLog('Starting TitanBot...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      startupLog('Initializing database...');
      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;
      
      const dbStatus = this.db.getStatus();
      if (dbStatus.isDegraded) {
        logger.warn('');
        logger.warn('╔═══════════════════════════════════════════════════════╗');
        logger.warn('║ ⚠️  DATABASE RUNNING IN DEGRADED MODE                 ║');
        logger.warn('║                                                       ║');
        logger.warn('║ Connection: In-Memory Storage (PostgreSQL unavailable)║');
        logger.warn('║ Data Persistence: DISABLED - data lost on restart    ║');
        logger.warn('║ Action Required: Fix PostgreSQL and restart bot      ║');
        logger.warn('╚═══════════════════════════════════════════════════════╝');
        logger.warn('');
      } else {
        startupLog(`✅ Database Status: ${dbStatus.connectionType} (fully operational)`);
      }
      
      startupLog('Starting web server...');
      this.startWebServer();
      
      startupLog('Loading commands...');
      await loadCommands(this);
      startupLog(`Commands loaded: ${this.commands.size}`);
      
      startupLog('Loading handlers & events...');
      await this.loadHandlers();
      
      // VEILIGE EVENT LOADER (voorkomt crashes bij ontbrekende modules)
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
                      startupLog(`📅 Event geladen via app.js: ${event.name}`);
                  }
              } catch (eventError) {
                  logger.error(`⚠️ Kon event bestand ${file} niet laden: ${eventError.message}`);
              }
          }
      }
      
      // START INVITE CACHE SCANNER & COMMAND REGISTRATIE PAS NÁ ÉCHTE LOGIN
      this.once('clientReady', async () => {
        startupLog('Scanning and caching server invites...');
        this.guilds.cache.forEach(async (guild) => {
          try {
            const firstInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(firstInvites.map((inv) => [inv.code, inv.uses])));
          } catch (err) {
            logger.error(`Kon invites niet cachen voor server ${guild.id}:`, err.message);
          }
        });
        startupLog('✅ Server invites successfully cached!');

        startupLog('Registering slash commands...');
        await registerSlashCommands(this, this.config.bot.guildId);
        startupLog('Slash commands registration complete');

        const databaseMode = dbStatus.isDegraded
          ? 'Optional in-memory mode (data resets after restart)'
          : 'Connected (persistent data enabled)';
        const handlerSummary = `${this.buttons.size} buttons, ${this.selectMenus.size} menus, ${this.modals.size} modals`;
        startupLog(
          `ONLINE ✅ | ${this.commands.size} commands loaded | ${handlerSummary} | Database: ${databaseMode}`
        );
      });

      startupLog('Logging into Discord...');
      await this.login(this.config.bot.token);
      startupLog('Discord login linkage completed!');
      
      this.setupCronJobs();
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    const configuredPort = Number(this.config.api?.port || process.env.PORT || 3000);
    const host = process.env.WEB_HOST || '0.0.0.0';
    const corsOrigin = this.config.api?.cors?.origin || '*';
    
    app.use((req, res, next) => {
      const allowedOrigins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];
      const origin = req.headers.origin;
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    const requestCounts = new Map();
    const windowMs = 60000; 
    const maxRequests = this.config.api?.rateLimit?.max || 100;
    
    app.use((req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
      }
      
      const times = requestCounts.get(ip).filter(t => t > windowStart);
      
      if (times.length >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests' });
      }
      
      times.push(now);
      requestCounts.set(ip, times);
      next();
    });

    // Railway Health Check route
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', database: this.db ? 'Connected' : 'Disconnected' });
    });

    app.listen(configuredPort, host, () => {
      startupLog(`Web server running on http://${host}:${configuredPort}`);
    });
  }

  async loadHandlers() {
    return true;
  }

  setupCronJobs() {
    cron.schedule('0 0 * * *', () => {
      startupLog('Running daily birthday check...');
      checkBirthdays(this);
    });

    cron.schedule('*/1 * * * *', () => {
      checkGiveaways(this);
    });
  }
}

const bot = new TitanBot();
bot.start();
