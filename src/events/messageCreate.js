import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            // Basis checks
            if (message.author.bot || !message.guild) return;

            // Dit zorgt ervoor dat normale commando's (!help, etc) blijven werken
            const prefix = '!'; // Of jouw prefix
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName);
            if (command) {
                await command.execute(message, args);
            }
        } catch (error) {
            console.error('Fout in messageCreate:', error);
        }
    }
};
