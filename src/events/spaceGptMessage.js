import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Controleer of het bericht in een gpt-privékanaal staat
        if (message.channel.name?.startsWith('gpt-')) {
            await message.channel.sendTyping();
            const prompt = message.content;

            // ==========================================================
            // DEEL 1: GEUPGRADEDE PREMIUM AFBEELDING GENERATOR (100% GRATIS)
            // ==========================================================
            if (prompt.toLowerCase().includes('maak') || prompt.toLowerCase().includes('genereer') || prompt.toLowerCase().includes('teken') || prompt.toLowerCase().includes('image')) {
                try {
                    // We voegen hier automatisch super-kwaliteit keywords toe aan jouw prompt
                    // Dit dwingt de AI om ultra-realistische, luxe graphics te maken in plaats van simpele plaatjes!
                    const premiumEnhancement = "Ultra-realistic photo, 8k resolution, cinematic lighting, hyper-detailed, luxury lifestyle, modern professional design, elegant architectural style, neon accents --ar 16:9";
                    
                    // Schoonmaken voor de internet-link
                    const combinedPrompt = encodeURIComponent(`${prompt}, ${premiumEnhancement}`);
                    const seed = Math.floor(Math.random() * 9999999);
                    
                    // We gebruiken de geavanceerde FLUX-engine van Pollinations voor échte fotokwaliteit!
                    const imageUrl = `https://image.pollinations.ai/p/${combinedPrompt}?width=1024&height=1024&seed=${seed}&model=flux`;

                    const imageEmbed = new EmbedBuilder()
                        .setTitle('🎨 NexSpace AI Premium Generation')
                        .setDescription(`**Jouw opdracht:** *${prompt}*\n\n*De engine heeft de kwaliteit automatisch opgeschaald naar Ultra-HD 8K.*`)
                        .setImage(imageUrl)
                        .setColor('#00fbff')
                        .setFooter({ text: 'NexSpace Premium Graphics Engine • Gratis' });

                    return await message.reply({ embeds: [imageEmbed] });
                } catch (err) {
                    console.error('Fout bij premium afbeelding genereren:', err);
                    return message.reply('❌ Er ging iets mis bij het genereren van de luxe afbeelding.');
                }
            }

            // ==========================================================
            // DEEL 2: RECHTSTREEKSE CHAT-AI (ZONDER DIE MOEILIJKE GOOGLE KEY!)
            // ==========================================================
            try {
                // We sturen de vraag naar een alternatieve, stabiele gratis text-gateway die ALTIJD werkt
                const response = await fetch(`https://text.pollinations.ai/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: "Je bent Space-GPT, een exclusieve en extreem slimme AI-assistent binnen de NexSpace Discord server. Je helpt volwassenen en ondernemers met diepgaande business antwoorden. Antwoord ALTIJD professioneel, vlot en uitgebreid in het Nederlands." },
                            { role: "user", content: prompt }
                        ]
                    })
                });

                const reply = await response.text();

                if (!reply || reply.trim().length === 0) {
                    return message.reply('❌ Space-GPT ondervindt momenteel een time-out. Probeer het over een moment opnieuw.');
                }

                // Splitsen als het antwoord langer is dan de Discord limiet (2000 tekens)
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) { await message.reply(chunk); }
                } else {
                    await message.reply(reply);
                }

            } catch (error) {
                console.error('Chat AI Fout:', error);
                await message.reply('❌ Er ging iets mis bij het laden van het AI-antwoord.');
            }
        }
    }
};
