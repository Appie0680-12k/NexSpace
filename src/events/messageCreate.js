import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            // 1. Negeer bots en berichten buiten de server
            if (message.author.bot || !message.guild) return;

            // 2. Je prefix
            const prefix = '!'; 

            // 3. Als het bericht niet met ! begint, doen we niets
            // (Zo kunnen nexPartner.js en nexLevels.js hun eigen ding doen)
            if (!message.content.startsWith(prefix)) return;

            // 4. Haal het commando uit het bericht
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // 5. Voer het commando uit als het in je commands-map staat
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (command) {
                await command.execute(message, args);
            }

        } catch (error) {
            console.error('Fout in messageCreate:', error);
        }
    }
};
