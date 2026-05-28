import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Controleer of het bericht in een gpt-privékanaal staat
        if (message.channel.name?.startsWith('gpt-')) {
            const prompt = message.content;

            // Start direct het typen-icoontje zodat Discord weet dat de bot bezig is
            await message.channel.sendTyping();

            // ==========================================================
            // DEEL 1: ULTRA-HD LUXE AFBEELDING GENERATOR (BLIKSEMSNEL)
            // ==========================================================
            if (prompt.toLowerCase().includes('maak') || prompt.toLowerCase().includes('genereer') || prompt.toLowerCase().includes('teken') || prompt.toLowerCase().includes('image')) {
                try {
                    // Deze lijst met Engelse vaktermen dwingt de AI om ALTIJD extreem luxe, 
                    // fotorealistische en high-end resultaten te leveren in plaats van simpele tekeningen.
                    const luxuryEnhancement = "hyper-realistic 8k photo, cinematic lighting, corporate luxury style, professional photography, award-winning architectural design, elegant, highly detailed, photorealistic, premium quality";
                    
                    // We voegen jouw vraag en de luxe-termen samen en maken de link klaar voor internet
                    const combinedPrompt = encodeURIComponent(`${prompt}, ${luxuryEnhancement}`);
                    
                    // Een unieke code per bericht zodat hij nooit een oud plaatje hergebruikt
                    const seed = Math.floor(Math.random() * 9999999);
                    
                    // We gebruiken de razendsnelle en stabiele standaard-engine (laadt direct!)
                    const imageUrl = `https://image.pollinations.ai/p/${combinedPrompt}?width=1024&height=1024&seed=${seed}`;

                    const imageEmbed = new EmbedBuilder()
                        .setTitle('🎨 NexSpace AI Premium Generation')
                        .setDescription(`**Jouw opdracht:** *${prompt}*\n\n*De engine heeft de details automatisch opgeschaald naar Ultra-HD Luxury Kwaliteit.*`)
                        .setImage(imageUrl)
                        .setColor('#00fbff')
                        .setFooter({ text: 'NexSpace Premium Graphics Engine • Live' });

                    return await message.reply({ embeds: [imageEmbed] });
                } catch (err) {
                    console.error('Fout bij premium afbeelding genereren:', err);
                    return message.reply('❌ Er ging iets mis bij het genereren van de luxe afbeelding.');
                }
            }

            // ==========================================================
            // DEEL 2: RECHTSTREEKSE CHAT-AI (TEXT)
            // ==========================================================
            try {
                const response = await fetch(`https://text.pollinations.ai/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: "Je bent Space-GPT, een exclusieve en extreem slimme AI-assistent binnen de NexSpace Discord server. Je helpt ondernemers. Antwoord altijd direct, professioneel en uitgebreid in het Nederlands." },
                            { role: "user", content: prompt }
                        ]
                    })
                });

                const reply = await response.text();

                if (!reply || reply.trim().length === 0) {
                    return message.reply('❌ Space-GPT ondervindt momenteel een time-out. Probeer het over een moment opnieuw.');
                }

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
