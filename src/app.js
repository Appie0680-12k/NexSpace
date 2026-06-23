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
      console.log('\n🚀 TitanBot handmatige startprocedure activeert...\n');

      if (!CLEAN_TOKEN) {
        console.error('❌ Geen Discord token gevonden.');
        process.exit(1);
      }

      // 1. DATABASE
      try {
        const dbInstance = await initializeDatabase();
        this.db = dbInstance.db;
        console.log('✅ Database verbinding succesvol.');
      } catch (dbError) {
        console.error(`⚠️ Database waarschuwing: ${dbError.message}`);
      }

      // 2. WEB SERVER
      this.startWebServer();

      // 3. KOGELVRIJE INBUILT COMMAND LOADER (Omzeilt de kapotte handler)
      console.log('📂 Bestanden scannen op commando\'s...');
      const commandsPath = path.join(__dirname, 'commands');
      
      if (fs.existsSync(commandsPath)) {
        // Scant alle submappen (zoals moderation, info, etc.)
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
                console.log(`   ➡️ Gevonden & Geladen: /${command.data.name}`);
              }
            } catch (cmdLoadErr) {
              console.error(`❌ Fout bij laden van bestand ${file}: ${cmdLoadErr.message}`);
            }
          }
        }
      }
      console.log(`✅ Totaal aantal succesvol geladen commando's: ${this.commands.size}`);

      // 4. EVENTS LADEN
      console.log('📅 Events laden...');
      await this.loadEvents();

      // 5. LOGIN & FORCED REGISTRATION
      console.log('🔐 Inloggen bij Discord...');
      
      this.once('ready', async () => {
        console.log(`✅ Bot online als ${this.user.tag}`);

        try {
          console.log('📡 [REST-PUSH] Slash commando\'s forceren naar Discord...');
          const targetGuildId = '1475577072381460521';
          
          if (this.commands.size === 0) {
            console.error('❌ CRITIEK: Er zijn 0 commando\'s in het geheugen geladen. Registratie afgebroken.');
            return;
          }

          const commandsData = this.commands.map(cmd => cmd.data.toJSON());

          // Push direct naar jouw server voor instant updates
          await this.rest.put(
            Routes.applicationGuildCommands(this.user.id, targetGuildId),
            { body: commandsData }
          );

          // Globale backup push
          await this.rest.put(
            Routes.applicationCommands(this.user.id),
            { body: commandsData }
          );

          console.log(`🎉 SUCCES: Alle ${this.commands.size} commando's zijn direct ingeschoten bij Discord!`);
        } catch (regErr) {
          console.error(`❌ Discord REST weigerde registratie: ${regErr.message}`);
        }
      });

      await this.login(CLEAN_TOKEN);

    } catch (err) {
      console.error(`❌ Startup gecrasht: ${err.message}`);
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
        } catch (e) {}
      }
      console.log(`🎉 ${this.events.size} events operationeel.`);
    } catch (err) {}
  }

  startWebServer() {
    const app = express();
    app.get('/', (req, res) => res.status(200).send('🚀 TitanBot Online!'));
    app.listen(PORT, () => console.log(`🌐 Webserver actief op poort ${PORT}`));
  }
}

const bot = new TitanBot();
process.on('unhandledRejection', (reason) => console.error('⚠️ Anti-Crash:', reason));
process.on('uncaughtException', (error) => console.error('⚠️ Anti-Crash:', error));
bot.start();
