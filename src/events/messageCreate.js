import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            // Basis check: negeer bots en berichten buiten servers
            if (message.author.bot || !message.guild) return;

            // Hier hoeft verder niets in te staan voor de levels, 
            // want dat regelt nexLevels.js nu apart.
            
        } catch (error) {
            console.error('Error in messageCreate:', error);
        }
    }
};

        
