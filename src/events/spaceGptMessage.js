import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // Zorg dat de bot niet op zichzelf reageert en alleen in gpt-kanalen werkt
        if (message.author.bot || !message.guild) return;
        if (!message.channel.name?.startsWith('gpt-')) return;
        if (message.content.startsWith('/')) return;

        const prompt = message.content;

        // Start direct het typen-icoontje in Discord
        await message.channel.sendTyping();

        try {
            // ==========================================================
            // STAP 1: GEHEUGEN OPHALEN (Chatgeschiedenis uit het kanaal)
            // ==========================================================
            const fetchedMessages = await message.channel.messages.fetch({ limit: 10 }); // Verlaagd naar 10 voor extra snelheid
            const conversationHistory = [];

            const reverseMessages = Array.from(fetchedMessages.values()).reverse();

            for (const msg of reverseMessages) {
                // Sla foutmeldingen en embed-berichten over voor het schone geheugen
                if (msg.content && !msg.content.includes('{"error":') && !msg.content.includes('❌')) {
                    if (msg.author.id === message.client.user.id) {
                        conversationHistory.push({ role: "assistant", content: msg.content });
                    } else {
                        conversationHistory.push({ role: "user", content: msg.content });
                    }
                }
            }

            // ==========================================================
            // DEEL 2: AFBEELDING GENERATOR MET GEHEUGEN
            // ==========================================================
            const isImageRequest = prompt.toLowerCase().includes('maak') || 
                                   prompt.toLowerCase().includes('genereer') || 
                                   prompt.toLowerCase().includes('teken') || 
                                   prompt.toLowerCase().includes('image') ||
                                   prompt.toLowerCase().includes('pas aan') ||
                                   prompt.toLowerCase().includes('verander') ||
                                   prompt.toLowerCase().includes('doe');

            if (isImageRequest) {
                const allUserPrompts = conversationHistory
                    .filter(h => h.role === "user")
                    .map(h => h.content)
                    .join(", ");

                const luxuryEnhancement = "hyper-realistic 8k photo, cinematic lighting, corporate luxury style, professional photography, award-winning architectural design, elegant, highly detailed, photorealistic, premium quality";
                
                const combinedPrompt = encodeURIComponent(`${allUserPrompts}, ${luxuryEnhancement}`);
                const seed = Math.floor(Math.random() * 9999999);
                const imageUrl = `https://image.pollinations.ai/p/${combinedPrompt}?width=1024&height=1024&seed=${seed}`;

                const imageEmbed = new EmbedBuilder()
                    .setTitle('🎨 NexSpace AI Premium Generation')
                    .setDescription(`**Jouw opdracht:** *${prompt}*\n\n*Kwaliteit automatisch geoptimaliseerd naar Ultra-HD Luxury.*`)
                    .setImage(imageUrl)
                    .setColor('#00fbff')
                    .setFooter({ text: 'NexSpace Premium Graphics Engine • Live' });

                return await message.reply({ embeds: [imageEmbed] });
            }

            // ==========================================================
            // DEEL 3: RECHSTREEKSE CHAT-AI (SNELLER & GEEN QUEUE LIMIT)
            // ==========================================================
            // We sturen de aanvraag via de stabiele GET-methode, deze omzeilt de drukke POST-wachtrij!
            const systemPrompt = "Je bent Space-GPT binnen de NexSpace Discord server. HOU JE ANTWOORDEN KORT EN BONDIG (maximaal 2-4 zinnen). Geef pas uitgebreide uitleg als de gebruiker hier expliciet naar vraagt. Antwoord altijd in het Nederlands.";
            
            // We pakken de laatste berichten samen als context
            const cleanHistory = conversationHistory.map(h => `${h.role === 'user' ? 'Gebruiker' : 'AI'}: ${h.content}`).join('\n');
            const fullContext = `${systemPrompt}\n\nGeschiedenis:\n${cleanHistory}\n\nGebruiker: ${prompt}\nAI:`;

            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullContext)}`);
            const reply = await response.text();

            if (!reply || reply.trim().length === 0 || reply.includes('Queue full')) {
                return message.reply('❌ Space-GPT ondervindt momenteel drukte. Probeer het over 3 seconden nog eens.');
            }

            // Versturen naar Discord
            if (reply.length > 2000) {
                const chunks = reply.match(/[\s\S]{1,1900}/g);
                for (const chunk of chunks) { await message.reply(chunk); }
            } else {
                await message.reply(reply);
            }

        } catch (error) {
            console.error('Space-GPT Error:', error);
            await message.reply('❌ Er ging iets mis bij het verwerken van je bericht.');
        }
    }
};
