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

            // ==========================================================
            // FEATURE: GRATIS AI AFBEELDING GENEREREN (Pollinations AI)
            // ==========================================================
            if (prompt.toLowerCase().includes('maak') || prompt.toLowerCase().includes('genereer') || prompt.toLowerCase().includes('teken') || prompt.toLowerCase().includes('image')) {
                try {
                    // We maken het prompt schoon voor de URL (spaties worden %20 enz.)
                    const cleanedPrompt = encodeURIComponent(prompt);
                    
                    // We genereren een unieke seed op basis van de tijd zodat het plaatje altijd uniek is
                    const seed = Math.floor(Math.random() * 999999);
                    
                    // Dit is de magische gratis URL die direct een AI-plaatje genereert!
                    const imageUrl = `https://image.pollinations.ai/p/${cleanedPrompt}?width=1024&height=1024&seed=${seed}`;

                    const imageEmbed = new EmbedBuilder()
                        .setTitle('🎨 Jouw Gratis AI Generatie')
                        .setDescription(`**Prompt:** *${prompt}*`)
                        .setImage(imageUrl)
                        .setColor('#00fbff')
                        .setFooter({ text: 'Gegeneerd door Space-GPT Engine (Gratis)' });

                    return await message.reply({ embeds: [imageEmbed] });

                } catch (err) {
                    console.error('Fout bij gratis afbeelding genereren:', err);
                    return message.reply('❌ Er ging iets mis bij het genereren van de afbeelding.');
                }
            }

            // ==========================================================
            // FEATURE: GRATIS CHATGPT LOGICA (Google Gemini AI)
            // ==========================================================
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Je bent Space-GPT, een exclusieve en slimme AI-assistent binnen de NexSpace Discord server. Je helpt volwassenen, ondernemers en beheerders met diepgaande antwoorden. Antwoord professioneel en vlot in het Nederlands. Vraag van de gebruiker: ${prompt}`
                            }]
                        }]
                    })
                });

                const data = await response.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!reply) {
                    return message.reply('❌ Space-GPT kon geen antwoord bedenken. Controleer of je GEMINI_API_KEY goed in Railway staat.');
                }

                // Splitsen als het antwoord langer is dan de Discord limiet (2000 tekens)
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
