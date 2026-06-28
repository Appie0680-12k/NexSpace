```javascript
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Laadt alle commando's op een veilige, crash-vrije manier.
 */
export async function loadCommands(client) {
    let commandsPath = path.join(__dirname, '..', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'src', 'commands');
    }
    if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'commands');
    }

    if (!fs.existsSync(commandsPath)) {
        console.error('❌ [COMMAND LOADER] Map niet gevonden!');
        return;
    }

    try {
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            
            try {
                const stat = fs.statSync(folderPath);
                if (!stat.isDirectory()) continue;
            } catch (e) {
                continue;
            }

            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                
                try {
                    const cmdModule = await import(pathToFileURL(filePath).href);
                    const command = cmdModule.default || cmdModule;

                    if (command && command.data && command.data.name) {
                        if (client.commands.has(command.data.name)) continue;
                        
                        client.commands.set(command.data.name, command);
                        console.log(`   ➡️  Succesvol geladen: /${command.data.name}`);
                    }
                } catch (fileError) {
                    console.error('⚠️ [LOADER] Fout in commando-bestand ' + file + ': ' + fileError.message);
                }
            }
        }
    } catch (dirError) {
        console.error('❌ [LOADER] Algemene scanfout: ' + dirError.message);
    }
}

/**
 * Registreert de geladen commando's bij Discord.
 */
export async function registerCommands(client, guildId) {
    try {
        if (!client.commands || client.commands.size === 0) {
            console.warn('⚠️ [REST] Geen commando\'s gevonden om te registreren.');
            return;
        }

        const commandsData = [];
        const uniqueNames = new Set();

        for (const [name, cmd] of client.commands) {
            if (uniqueNames.has(name)) continue;
            uniqueNames.add(name);

            try {
                if (cmd.data && typeof cmd.data.toJSON === 'function') {
                    commandsData.push(cmd.data.toJSON());
                } else if (cmd.data) {
                    commandsData.push(cmd.data);
                }
            } catch (jsonErr) {}
        }

        // --- DISCORD LIMIET BEWAKING (Max 95 stuks) ---
        if (commandsData.length > 95) {
            console.warn('⚠️ Te veel commando\'s (' + commandsData.length + ')! Afgeplat naar 95.');
            commandsData.splice(95);
        }

        const rest = new REST({ version: '10' }).setToken(client.token);

        console.log('📡 [REST] Bezig met registreren van ' + commandsData.length + ' commando\'s...');

        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandsData }
            );
            console.log('✅ [REST] Commando\'s direct geactiveerd op server: ' + guildId);
        } else {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData }
            );
            console.log('✅ [REST] Commando\'s globaal geregistreerd.');
        }

    } catch (error) {
        console.error('❌ [REST] Discord API weigerde registratie: ' + error.message);
    }
}

```
