import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    execute(message) {
        if (message.author.bot) return;
    },
};
