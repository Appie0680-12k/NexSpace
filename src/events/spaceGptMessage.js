import { Events, EmbedBuilder } from 'discord.js';

const cooldowns = new Map();

export default {
    name: Events.MessageCreate,

    async execute(message) {

        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.channel.name?.startsWith('gpt-')) return;

        const userId = message.author.id;

        if (cooldowns.has(userId)) {
            const expires = cooldowns.get(userId);

            if (Date.now() < expires) {
                return;
            }
        }

        cooldowns.set(userId, Date.now() + 3000);

        const prompt = message.content.trim();

        if (!prompt) return;

        await message.channel.sendTyping();

        try {

            // =========================
            // AFBEELDINGEN
            // =========================

            const imageWords = [
                'maak',
                'genereer',
                'teken',
                'afbeelding',
                'foto',
                'image',
                'picture'
            ];

            const isImageRequest =
                imageWords.some(word =>
                    prompt.toLowerCase().includes(word)
                );

            if (isImageRequest) {

                const imageUrl =
                    `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024`;

                const embed = new EmbedBuilder()
                    .setTitle('🎨 NexSpace AI')
                    .setDescription(`**Prompt:** ${prompt}`)
                    .setImage(imageUrl)
                    .setColor('#00fbff')
                    .setTimestamp();

                return await message.reply({
                    embeds: [embed]
                });
            }

            // =========================
            // CHAT AI
            // =========================

            const response = await fetch(
                `https://text.pollinations.ai/${encodeURIComponent(prompt)}`
            );

            if (!response.ok) {

                return await message.reply(
                    '❌ AI-service tijdelijk niet beschikbaar.'
                );
            }

            const answer = await response.text();

            if (!answer || answer.length < 2) {

                return await message.reply(
                    '❌ Geen geldig antwoord ontvangen.'
                );
            }

            if (answer.length > 2000) {

                const chunks =
                    answer.match(/[\s\S]{1,1900}/g) || [answer];

                for (const chunk of chunks) {

                    await message.channel.send(chunk);
                }

            } else {

                await message.reply(answer);
            }

        } catch (error) {

            console.error(
                '[SPACE GPT ERROR]',
                error
            );

            await message.reply(
                '❌ Er ging iets mis bij het verwerken van je vraag.'
            );
        }
    }
};
