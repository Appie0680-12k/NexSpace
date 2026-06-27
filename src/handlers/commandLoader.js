```javascript
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Laadt alle commando's op een 100% crash-vrije manier in de bot.
 */
export async function loadCommands(client) {
    // Vind de commands map relatief aan deze handler (src/commands)
    let commandsPath = path.join(__dirname, '..', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'src', 'commands');
    }
    if (!fs.existsSync(commandsPath)) {
        commandsPath = path.join(process.cwd(), 'commands');
    }

    if (!fs.existsSync(commandsPath)) {
        console.error('❌ [COMMAND LOADER] Kon de commands map nergens vinden!');
        return;
    }

    try {
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;

            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                
                try {
                    // Laad het commando bestand dynamisch in
                    const cmdModule = await import(pathToFileURL(filePath).href);
                    const command = cmdModule.default || cmdModule;

                    if (command && command.data && command.data.name) {
                        // Voorkom dubbel laden van commando's
                        if (client.commands.has(command.data.name)) {
                            console.warn(`   ⚠️  Dubbel commando overgeslagen: /${command.data.name}`);
                            continue;
                        }
                        
                        client.commands.set(command.data.name, command);
                        console.log(`   ➡️  Succesvol geladen: /${command.data.name}`);
                    } else {
                        console.warn(`   ⚠️  Bestand overgeslagen: src/commands/${folder}/${file} mist een geldige 'data' export.`);
                    }
                } catch (fileError) {
                    // CRASH BESCHERMING: Vangt syntaxfouten op zodat de bot niet offline gaat!
                    console.error('\n==================================================================');
                    console.error(`🚨 [CRASH SCHILD] ER ZIT EEN CODE-FOUT IN HET BESTAND: src/commands/${folder}/${file}`);
                    console.error(`👉 FOUTMELDING: ${fileError.message}`);
                    console.error('==================================================================\n');
                }
            }
        }
        console.log(`✅ [COMMAND LOADER] Klaar met laden. Totaal ingeladen commando's: ${client.commands.size}`);
    } catch (dirError) {
        console.error(`❌ Fout tijdens het scannen van de commands map: ${dirError.message}`);
    }
}

/**
 * Registreert de geladen commando's veilig bij Discord.
 */
export async function registerCommands(client, guildId) {
    try {
        if (!client.commands || client.commands.size === 0) {
            console.warn('⚠️ [REGISTRATIE] Geen commando\'s gevonden in het geheugen.');
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
            } catch (jsonErr) {
                console.error(`⚠️ Kon commando /${name} niet omvormen naar JSON: ${jsonErr.message}`);
            }
        }

        // Voorkom dat we over de limiet van 100 commando's heen gaan
        if (commandsData.length > 100) {
            console.error(`🚨 [LIMIT REACHED] Je hebt ${commandsData.length} commando's! Discord staat er max 100 toe. We registreren alleen de eerste 100.`);
            commandsData.splice(100);
        }

        const rest = new REST({ version: '10' }).setToken(client.token);

        console.log(`📡 [DISCORD] Bezig met registreren van ${commandsData.length} commando's...`);

        if (guildId) {
            // Directe registratie voor je eigen server (NexSpace)
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandsData }
            );
            console.log(`✅ [DISCORD] Commando's direct live gezet op server ID: ${guildId}`);
        } else {
            // Globale registratie (wereldwijd)
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData }
            );
            console.log('✅ [DISCORD] Commando\'s wereldwijd geregistreerd.');
        }

    } catch (error) {
        console.error(`❌ [DISCORD REGISTRATIE FOUT]: ${error.message}`);
    }
}

```
