import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.channel.name?.startsWith('gpt-')) return;

        const prompt = message.content.trim();

        if (!prompt) return;

        await message.channel.sendTyping();

        try {

            // =========================
            // AFBEELDINGEN
            // =========================

            const imageKeywords = [
                'maak een afbeelding',
                'maak een foto',
                'genereer afbeelding',
                'genereer foto',
                'teken',
                'draw'
            ];

            const isImageRequest = imageKeywords.some(keyword =>
                prompt.toLowerCase().includes(keyword)
            );

            if (isImageRequest) {

                const imageUrl =
                    `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024`;

                const embed = new EmbedBuilder()
                    .setTitle('🎨 Space-GPT Afbeelding')
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

            const aiUrl =
                `https://text.pollinations.ai/${encodeURIComponent(
                    `Je bent Space-GPT van NexSpace. Antwoord altijd in het Nederlands.\n\nGebruiker: ${prompt}`
                )}`;

            const response = await fetch(aiUrl);

            if (!response.ok) {
                console.log(
                    'AI Error:',
                    response.status,
                    response.statusText
                );

                return await message.reply(
                    '❌ De AI-service reageert momenteel niet.'
                );
            }

            const answer = await response.text();

            if (!answer || answer.trim().length < 2) {
                return await message.reply(
                    '❌ Ik ontving geen geldig antwoord van de AI.'
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

            console.error('SPACE GPT ERROR:', error);

            await message.reply(
                '❌ Er is een fout opgetreden tijdens het verwerken van je bericht.'
            );
        }
    }
};
