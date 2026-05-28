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
            // STAP 1: GEHEUGEN OPHALEN
            // ==========================================================
            const fetchedMessages = await message.channel.messages.fetch({ limit: 10 });
            const conversationHistory = [];

            const reverseMessages = Array.from(fetchedMessages.values()).reverse();

            for (const msg of reverseMessages) {
                if (msg.content && !msg.content.includes('{"error":') && !msg.content.includes('❌')) {
                    if (msg.author.id === message.client.user.id) {
                        conversationHistory.push({ role: "assistant", content: msg.content });
                    } else {
                        conversationHistory.push({ role: "user", content: msg.content });
                    }
                }
            }

            // ==========================================================
            // STAP 2: SLIMME CHECK - IS DIT EEN AFBEELDING OF TEKST?
            // ==========================================================
            const triggerWords = ['maak', 'genereer', 'teken', 'image', 'pas aan', 'verander', 'doe'];
            const textOverrideWords = ['verhaal', 'tekst', 'uitleg', 'code', 'script', 'gedicht', 'brief', 'samenvatting'];

            // Het is een afbeelding als een triggerwoord erin zit...
            let isImageRequest = triggerWords.some(word => prompt.toLowerCase().includes(word));
            
            // ...MAAR als er ook woorden zoals 'verhaal' of 'tekst' in staan, is het ALTIJD tekst!
            const hasTextOverride = textOverrideWords.some(word => prompt.toLowerCase().includes(word));
            if (hasTextOverride) {
                isImageRequest = false;
            }

            // ==========================================================
            // DEEL 3: AFBEELDING GENERATOR
            // ==========================================================
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
            // DEEL 4: CHAT-AI (NU MET EXTRASINDS VOOR VERHALEN)
            // ==========================================================
            // Systeeminstructie aangepast zodat hij kort reageert bij info, maar wél verhalen mag schrijven als je erom vraagt!
            const systemPrompt = "Je bent Space-GPT binnen de NexSpace Discord server. HOU JE ANTWOORDEN KORT EN BONDIG (maximaal 2-4 zinnen) bij normale vragen en feiten. ALS de gebruiker expliciet vraagt om een verhaal, code of uitgebreide uitleg, dan mag je wél een lang en creatief antwoord geven. Antwoord altijd in het Nederlands.";
            
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

