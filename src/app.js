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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invitesCache = new Map();

const CLEAN_TOKEN = (process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN)?.replace(/["']/g, '').trim() || null;
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
      partials: [Partials.Channel, Partials.Message],
    });

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
      console.log('\n🚀 TitanBot stabiele startprocedure geactiveerd...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ CRITIEK: Geen Discord token gevonden.');
        process.exit(1);
      }

      // 1. STABIELE DATABASE CONNECTIE MET AUTO-RECONNECT
      await this.connectDatabase();

      // 2. KEEP-ALIVE WEB SERVER
      this.startWebServer();

      // 3. COMMAND LOADER
      console.log('📂 Mappen scannen naar slash commando\'s...');
      let commandsPath = path.join(__dirname, 'commands');
      if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(__dirname, 'src', 'commands');
      }
      if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'src', 'commands');
      }
      if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'commands');
      }

      if (fs.existsSync(commandsPath)) {
        const commandFolders = fs.readdirSync(commandsPath);
        
        for (const folder of commandFolders) {
          const folderPath = path.join(commandsPath, folder);
          if (!fs.statSync(folderPath).isDirectory()) continue;
          
          const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
          for (const file of commandFiles) {
            try {
              const filePath = path.join(folderPath, file);
              const cmdModule = await import(pathToFileURL(filePath).href);
              const command = cmdModule.default || cmdModule;
              
              if (command && command.data && command.data.name) {
                // Voorkom dubbel laden van exact hetzelfde commando
                if (this.commands.has(command.data.name)) {
                  console.warn(`   ⚠️  Dubbel commando overgeslagen: /${command.data.name}`);
                  continue;
                }
                this.commands.set(command.data.name, command);
                console.log(`   ➡️  Succesvol geladen: /${command.data.name}`);
              }
            } catch (cmdLoadErr) {
              console.error(`   ❌ FOUT in bestand ${folder}/${file}: ${cmdLoadErr.message}`);
            }
          }
        }
      }
      
      console.log(`🤖 Totaal unieke commando's geladen in geheugen: ${this.commands.size}`);

      // 4. EVENTS INLADEN
      console.log('📅 Systeemevents inladen...');
      await this.loadEvents();

      // 5. LOGIN & DYNAMISCHE REGISTRATIE (MET LIMIET-BEWAKING)
      console.log('🔐 Aanmelden bij Discord...');
      
      this.once('ready', async () => {
        console.log(`\n🟢 Bot is live! Ingelogd als: ${this.user.tag}`);

        try {
          if (this.commands.size === 0) {
            console.error('❌ Registratie gestopt: 0 commando\'s geladen.');
            return;
          }

          // Zet unieke commando's om naar JSON
          const commandsData = [];
          const uniqueNames = new Set();

          for (const [name, cmd] of this.commands) {
            if (uniqueNames.has(name)) continue;
            uniqueNames.add(name);

            try {
              if (cmd.data && typeof cmd.data.toJSON === 'function') {
                commandsData.push(cmd.data.toJSON());
              } else if (cmd.data) {
                commandsData.push(cmd.data);
              }
            } catch (jsonErr) {
              console.error(`   ⚠️ Kon commando /${name} niet omvormen tot JSON: ${jsonErr.message}`);
            }
          }

          // Check de Discord harde limiet van 100 commando's
          if (commandsData.length > 100) {
            console.error(`❌ CRITIEK: Je probeert ${commandsData.length} commando's te laden. Discord staat er maximaal 100 toe! Verwijder ongebruikte .js bestanden.`);
            // Filter de lijst terug naar de eerste 100 om crash te voorkomen
            commandsData.splice(100);
          }

          console.log(`📡 Registreren van ${commandsData.length} commando's bij Discord...`);

          // Direct forceren op je NexSpace server voor instant resultaat
          const targetGuildId = '1475577072381460521';
          try {
            await this.rest.put(
              Routes.applicationGuildCommands(this.user.id, targetGuildId),
              { body: commandsData }
            );
            console.log(`   ⚡ Direct live gezet op server ID: ${targetGuildId}`);
          } catch (guildRegErr) {
            console.error(`   ❌ Kon niet direct naar server pushen: ${guildRegErr.message}`);
          }

          // Globale registratie als back-up
          await this.rest.put(
            Routes.applicationCommands(this.user.id),
            { body: commandsData }
          );

          console.log('🎉 [REGISTRATIE VOLTOOID] Alle commando\'s zijn succesvol verwerkt!');
        } catch (regErr) {
          console.error(`❌ Discord API weigerde registratie: ${regErr.message}`);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error(`❌ Startup mislukt: ${err.message}`);
      process.exit(1);
    }
  }

  // Database verbinding met automatische herverbinding bij timeouts
  async connectDatabase() {
    console.log('🗄️ Verbinden met database...');
    try {
      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;
      console.log('✅ Database succesvol verbonden.');

      // Vang database pool-fouten op om crashes te voorkomen
      if (this.db && typeof this.db.on === 'function') {
        this.db.on('error', async (err) => {
          console.error('⚠️ [DATABASE FOUT] Verbinding verloren:', err.message);
          if (err.message.includes('terminated unexpectedly') || err.message.includes('timeout')) {
            console.log('🔄 Poging tot herstellen databaseverbinding...');
            await this.connectDatabase().catch(() => null);
          }
        });
      }
    } catch (dbError) {
      console.warn(`⚠️ Database herstart/verbindingsfout: ${dbError.message}`);
      // Probeer na 10 seconden opnieuw bij een mislukte start
      setTimeout(() => this.connectDatabase(), 10000);
    }
  }

  async loadEvents() {
    try {
      let eventsPath = path.join(__dirname, 'events');
      if (!fs.existsSync(eventsPath)) {
        eventsPath = path.join(__dirname, 'src', 'events');
      }
      if (!fs.existsSync(eventsPath)) {
        eventsPath = path.join(process.cwd(), 'src', 'events');
      }
      if (!fs.existsSync(eventsPath)) {
        eventsPath = path.join(process.cwd(), 'events');
      }

      if (!fs.existsSync(eventsPath)) return;

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
        } catch (e) {
          console.error(`❌ Fout bij laden event ${file}: ${e.message}`);
        }
      }
      console.log(`🎉 ${this.events.size} events succesvol opgestart.`);
    } catch (err) {
      console.error(`❌ Event loader fout: ${err.message}`);
    }
  }

  startWebServer() {
    const app = express();
    app.get('/', (req, res) => res.status(200).send('🚀 TitanBot Keep-Alive is actief!'));
    
    const server = app.listen(PORT, () => {
      console.log(`🌐 Webserver actief op poort ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        console.error('⚠️ Webserver fout:', err.message);
      }
    });
  }
}

const bot = new TitanBot();
process.on('unhandledRejection', (reason) => console.error('⚠️ [ANTI-CRASH] Onopgevangen fout:', reason));
process.on('uncaughtException', (error) => console.error('⚠️ [ANTI-CRASH] Systeemfout:', error));
bot.start();

```
