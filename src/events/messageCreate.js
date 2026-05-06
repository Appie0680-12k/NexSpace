import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            // 1. Basis checks: negeer bots en berichten buiten de server
            if (message.author.bot || !message.guild) return;

            // 2. Definieer je prefix (meestal '!')
            const prefix = '!'; 

            // 3. Check of het bericht begint met de prefix
            if (!message.content.startsWith(prefix)) return;

            // 4. Knip het bericht op in het commando en de argumenten
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // 5. Zoek het commando op in de collectie van de bot
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            // 6. Als het commando bestaat, voer het uit
            if (command) {
                await command.execute(message, args);
            }

        } catch (error) {
            console.error('Fout bij het uitvoeren van een commando:', error);
            // Optioneel: stuur een foutmelding naar de gebruiker
            // message.reply('Oeps! Er ging iets mis bij het uitvoeren van dit commando.');
        }
    }
};
