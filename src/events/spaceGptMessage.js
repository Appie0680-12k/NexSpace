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
            // We halen de laatste 15 berichten op uit het kanaal om als context mee te geven
            const fetchedMessages = await message.channel.messages.fetch({ limit: 15 });
            const conversationHistory = [];

            // We zetten de berichten in de juiste chronologische volgorde (oud naar nieuw)
            const reverseMessages = Array.from(fetchedMessages.values()).reverse();

            for (const msg of reverseMessages) {
                // Sla de systeem-embeds of lege berichten van de bot over voor de tekstcontext
                if (msg.author.id === message.client.user.id) {
                    if (msg.content) {
                        conversationHistory.push({ role: "assistant", content: msg.content });
                    }
                } else {
                    if (msg.content) {
                        conversationHistory.push({ role: "user", content: msg.content });
                    }
                }
            }

            // ==========================================================
            // DEEL 2: AFBEELDING GENERATOR MET GEHEUGEN (AANPASSINGEN DOEN)
            // ==========================================================
            const isImageRequest = prompt.toLowerCase().includes('maak') || 
                                   prompt.toLowerCase().includes('genereer') || 
                                   prompt.toLowerCase().includes('teken') || 
                                   prompt.toLowerCase().includes('image') ||
                                   prompt.toLowerCase().includes('pas aan') ||
                                   prompt.toLowerCase().includes('verander') ||
                                   prompt.toLowerCase().includes('doe dak'); // Extra trigger voor aanpassingen

            if (isImageRequest) {
                // We verzamelen alle eerdere prompts uit de geschiedenis zodat de AI snapt wat we aanpassen
                const allUserPrompts = conversationHistory
                    .filter(h => h.role === "user")
                    .map(h => h.content)
                    .join(", ");

                const luxuryEnhancement = "hyper-realistic 8k photo, cinematic lighting, corporate luxury style, professional photography, award-winning architectural design, elegant, highly detailed, photorealistic, premium quality";
                
                // Door alle gebruikersberichten samen te voegen, snapt de AI: "Huis" + "Doe dak rood" = Een luxe huis met een rood dak!
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
            // DEEL 3: CHAT-AI (KORT & BONDIG ZOALS CHATGPT)
            // ==========================================================
            // We bouwen de berichtenlijst op voor de AI, inclusief de strenge instructie
            const apiMessages = [
                { 
                    role: "system", 
                    content: "Je bent Space-GPT, een exclusieve en slimme AI-assistent binnen de NexSpace Discord server. Je helpt ondernemers. HOU JE ANTWOORDEN KORT EN BONDIG (maximaal 2-4 zinnen). Geef alleen een uitgebreid antwoord als de gebruiker expliciet vraagt om meer informatie, details of uitleg. Antwoord altijd in het Nederlands." 
                },
                ...conversationHistory // Hier stoppen we het geheugen erin!
            ];

            const response = await fetch(`https://text.pollinations.ai/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages })
            });

            const reply = await response.text();

            if (!reply || reply.trim().length === 0) {
                return message.reply('❌ Space-GPT ondervindt momenteel een time-out. Probeer het over een moment opnieuw.');
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
