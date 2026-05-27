import { Events, EmbedBuilder } from 'discord.js';
import { OpenAI } from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Controleer of het bericht in een gegenereerd gpt-kanaal is getypt
        if (message.channel.name?.startsWith('gpt-')) {
            await message.channel.sendTyping();
            const prompt = message.content;

            // AFBEELDING GENEREREN LOGICA
            if (prompt.toLowerCase().includes('maak') || prompt.toLowerCase().includes('genereer') || prompt.toLowerCase().includes('teken') || prompt.toLowerCase().includes('image')) {
                try {
                    const response = await openai.images.generate({
                        model: "dall-e-3",
                        prompt: prompt,
                        n: 1,
                        size: "1024x1024",
                    });

                    const imageUrl = response.data[0].url;
                    const imageEmbed = new EmbedBuilder()
                        .setTitle('🎨 Jouw AI Generatie')
                        .setImage(imageUrl)
                        .setColor('#00fbff')
                        .setFooter({ text: 'Gegeneerd door Space-GPT DALL-E 3' });

                    return message.reply({ embeds: [imageEmbed] });
                } catch (err) {
                    console.error(err);
                    return message.reply('❌ Er ging iets mis bij het genereren van de afbeelding. Controleer of je OpenAI account voldoende tegoed heeft.');
                }
            }

            // NORMALE TEKST CHATGPT LOGICA
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Je bent Space-GPT, een exclusieve AI-assistent binnen de NexSpace Discord server. Je helpt volwassenen, ondernemers en beheerders met diepgaande antwoorden. Reageer professioneel in het Nederlands." },
                        { role: "user", content: prompt }
                    ],
                });

                const reply = completion.choices[0].message.content;
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) { await message.reply(chunk); }
                } else {
                    await message.reply(reply);
                }
            } catch (error) {
                console.error(error);
                await message.reply('❌ Space-GPT kon je vraag niet verwerken.');
            }
        }
    }
};
