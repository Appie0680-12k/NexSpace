import { EmbedBuilder, Events } from 'discord.js';

let sfeerScore = 75; 
const positieveWoorden = ['gezellig', 'lekker', 'top', 'winst', 'hype', 'haha', 'lol', 'gg', 'mooi', 'held', 'diamant', '💎', '🔥'];
const negatieveWoorden = ['hoere', 'kut', 'slecht', 'dood', 'saai', 'tering', 'tyfus', 'klote', 'scam', 'leugen', 'fout', 'L'];

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // LUISTERT NU EXACT NAAR JOUW CHATKANAAL
        if (message.author.bot || !message.guild || message.channel.name !== '┃💭・kletshoek') return;

        const content = message.content.toLowerCase();
        let sfeerGewijzigd = false;

        positieveWoorden.forEach(w => { if (content.includes(w)) { sfeerScore = Math.min(100, sfeerScore + 1.5); sfeerGewijzigd = true; } });
        negatieveWoorden.forEach(w => { if (content.includes(w)) { sfeerScore = Math.max(0, sfeerScore - 2.5); sfeerGewijzigd = true; } });

        if (!sfeerGewijzigd) {
            if (sfeerScore > 75) sfeerScore -= 0.1;
            if (sfeerScore < 75) sfeerScore += 0.1;
        }

        if (sfeerScore >= 96) {
            sfeerScore = 70; 
            const dropEmbed = new EmbedBuilder()
                .setTitle('🎉 SFEER DROP GETRIGGERD! 🔥')
                .setDescription(`De sfeer in <#${message.channel.id}> bereikte zojuist de **${sfeerScore.toFixed(0)}%**! Iedereen ontvangt extra bonus credits!`)
                .setColor('#ffaa00')
                .setTimestamp();
            
            await message.channel.send({ embeds: [dropEmbed] });
        }

        if (message.content.toLowerCase() === '!sfeer') {
            let statusEmoji = '😐';
            if (sfeerScore >= 85) statusEmoji = '🔥';
            else if (sfeerScore >= 60) statusEmoji = '💬';
            else statusEmoji = '❄️';

            return message.reply(`De huidige sfeer in **#┃💭・kletshoek** is: **${statusEmoji} ${sfeerScore.toFixed(0)}%**`);
        }
    }
};
