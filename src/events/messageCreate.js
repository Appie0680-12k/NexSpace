import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (message.author.bot || !message.guild) return;

            // Dit zorgt dat je ! commands en slash commands blijven werken
            const prefix = '!'; 
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
