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
      console.log('\n🚀 TitanBot kogelvrije startprocedure geactiveerd...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ CRITIEK: Geen Discord token gevonden in Railway variabelen.');
        process.exit(1);
      }

      // 1. DATABASE CONNECTIE
      try {
        const dbInstance = await initializeDatabase();
        this.db = dbInstance.db;
        console.log('✅ Database succesvol verbonden.');
      } catch (dbError) {
        console.warn(`⚠️ Database melding: ${dbError.message}`);
      }

      // 2. KEEP-ALIVE SERVER
      this.startWebServer();

      // 3. HANDMATIGE DIRECT COMMAND LOADER
      console.log('📂 Mappen scannen naar slash commando\'s...');
      const commandsPath = path.join(__dirname, 'commands');
      
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
                this.commands.set(command.data.name, command);
                console.log(`   ➡️  Succesvol geladen: /${command.data.name}`);
              } else {
                console.warn(`   ⚠️  Mislukt: ${file} mist een geldige 'data' export.`);
              }
            } catch (cmdLoadErr) {
              console.error(`   ❌ FOUT in bestand ${folder}/${file}: ${cmdLoadErr.message}`);
            }
          }
        }
      } else {
        console.error('❌ FOUT: De map src/commands bestaat niet!');
      }
      
      console.log(`🤖 Totaal geladen commando's in geheugen: ${this.commands.size}`);

      // 4. EVENTS INLADEN
      console.log('📅 Systeemevents inladen...');
      await this.loadEvents();

      // 5. LOGIN & DYNAMISCHE REGISTRATIE
      console.log('🔐 Aanmelden bij Discord gateway...');
      
      this.once('ready', async () => {
        console.log(`\n🟢 Bot is live! Ingelogd als: ${this.user.tag}`);

        try {
          if (this.commands.size === 0) {
            console.error('❌ Registratie gestopt: 0 commando\'s geladen.');
            return;
          }

          const commandsData = this.commands.map(cmd => cmd.data.toJSON());

          // 1. GLOBALE REGISTRATIE (Altijd handig als back-up)
          console.log('📡 Commando\'s globaal registreren bij Discord...');
          await this.rest.put(
            Routes.applicationCommands(this.user.id),
            { body: commandsData }
          );

          // 2. DYNAMISCHE SERVER REGISTRATIE (Gegarandeerd direct live!)
          // We gaan elke server af waar de bot nu in zit en registreren ze daar direct
          console.log(`📡 Commando's direct forceren op alle actieve servers...`);
          const guilds = this.guilds.cache;
          
          if (guilds.size === 0) {
            console.warn('⚠️ De bot zit momenteel nog in 0 servers.');
          } else {
            for (const [guildId, guild] of guilds) {
              try {
                await this.rest.put(
                  Routes.applicationGuildCommands(this.user.id, guildId),
                  { body: commandsData }
                );
                console.log(`   ⚡ Direct gepusht naar server: ${guild.name} (${guildId})`);
              } catch (guildRegErr) {
                console.error(`   ❌ Kon niet pushen naar server ${guild.name}: ${guildRegErr.message}`);
              }
            }
          }

          console.log('🎉 [REGISTRATIE VOLTOOID] Al je commando\'s zijn nu direct live op je servers!');
        } catch (regErr) {
          console.error(`❌ Algemene Discord REST fout: ${regErr.message}`);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error(`❌ Startup mislukt: ${err.message}`);
      process.exit(1);
    }
  }

  async loadEvents() {
    try {
      const eventsPath = path.join(__dirname, 'events');
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
    app.listen(PORT, () => console.log(`🌐 Webserver actief op poort ${PORT}`));
  }
}

const bot = new TitanBot();
process.on('unhandledRejection', (reason) => console.error('⚠️ [ANTI-CRASH] Onopgevangen fout:', reason));
process.on('uncaughtException', (error) => console.error('⚠️ [ANTI-CRASH] Systeemfout:', error));
bot.start();
