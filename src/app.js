import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
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
        console.error(`⚠️ [DATABASE] Bypass geactiveerd: ${dbErr.message}`);
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
      // Controleer of de events map direct in de root of in src/ staat
      const eventsPath = fs.existsSync(path.join(__dirname, 'events')) 
        ? path.join(__dirname, 'events') 
        : path.join(__dirname, 'src', 'events');

      if (fs.existsSync(eventsPath)) {
          const eventFiles = fs.readdirSync(eventsPath).filter(file => file
