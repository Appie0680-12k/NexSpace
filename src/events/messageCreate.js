import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Als het een ! commando is, voer het uit via de commands map
        const prefix = '!'; 
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (command) await command.execute(message, args);
        }

        // De andere bestanden (zoals premiumCounting.js en partnerEngine.js) 
        // vangen het bericht nu zelf op omdat ze ook op 'messageCreate' staan.
    }
};
