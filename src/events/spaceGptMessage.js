import { Events, EmbedBuilder } from 'discord.js';
import 'dotenv/config';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Controleer of het bericht in een gpt-privékanaal is getypt
        if (message.channel.name?.startsWith('gpt-')) {
            await message.channel.sendTyping();
            const prompt = message.content;

            // --- FEAT: GRATIS AI AFBEELDING GENEREREN ---
            if (prompt.toLowerCase().includes('maak') || prompt.toLowerCase().includes('genereer') || prompt.toLowerCase().includes('teken') || prompt.toLowerCase().includes('image')) {
                try {
                    const cleanedPrompt = encodeURIComponent(prompt);
                    const seed = Math.floor(Math.random() * 999999);
                    const imageUrl = `https://image.pollinations.ai/p/${cleanedPrompt}?width=1024&height=1024&seed=${seed}`;

                    const imageEmbed = new EmbedBuilder()
                        .setTitle('🎨 Jouw Gratis AI Generatie')
                        .setDescription(`**Prompt:** *${prompt}*`)
                        .setImage(imageUrl)
                        .setColor('#00fbff')
                        .setFooter({ text: 'Gegeneerd door Space-GPT Engine (Gratis)' });

                    return await message.reply({ embeds: [imageEmbed] });
                } catch (err) {
                    console.error('Fout bij afbeelding genereren:', err);
                    return message.reply('❌ Er ging iets mis bij het genereren van de afbeelding.');
                }
            }

            // --- FEAT: GRATIS CHATGPT LOGICA (Google Gemini) ---
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Je bent Space-GPT, een exclusieve en slimme AI-assistent binnen de NexSpace Discord server. Je helpt volwassenen en ondernemers. Antwoord professioneel in het Nederlands. Vraag: ${prompt}`
                            }]
                        }]
                    })
                });

                const data = await response.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!reply) {
                    return message.reply('❌ Space-GPT kon geen antwoord bedenken. Controleer je GEMINI_API_KEY in Railway.');
                }

                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) { await message.reply(chunk); }
                } else {
                    await message.reply(reply);
                }

            } catch (error) {
                console.error('Gemini AI Fout:', error);
                await message.reply('❌ Er ging iets mis bij het verbinden met de gratis AI service.');
            }
        }
    }
};
