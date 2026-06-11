import { Events, EmbedBuilder } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // Zorg dat de bot niet op zichzelf reageert en alleen in gpt-kanalen werkt
        if (message.author.bot || !message.guild) return;
        if (!message.channel.name?.startsWith('gpt-')) return;
        if (message.content.startsWith('/')) return;

        const prompt = message.content.trim();

        // Start direct het typen-icoontje in Discord
        await message.channel.sendTyping();

        try {
            // ==========================================================
            // STAP 1: GEHEUGEN OPHALEN
            // ==========================================================
            const fetchedMessages = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
            const conversationHistory = [];

            if (fetchedMessages) {
                const reverseMessages = Array.from(fetchedMessages.values()).reverse();
                for (const msg of reverseMessages) {
                    if (msg.content && !msg.content.includes('❌') && !msg.content.includes('momenteel drukte')) {
                        if (msg.author.id === message.client.user.id) {
                            conversationHistory.push({ role: "assistant", content: msg.content });
                        } else {
                            conversationHistory.push({ role: "user", content: msg.content });
                        }
                    }
                }
            }

            // ==========================================================
            // STAP 2: SLIMME CHECK - IS DIT EEN AFBEELDING OF TEKST?
            // ==========================================================
            const triggerWords = ['maak', 'genereer', 'teken', 'image', 'picture', 'foto'];
            const textOverrideWords = ['verhaal', 'tekst', 'uitleg', 'code', 'script', 'samenvatting'];

            let isImageRequest = triggerWords.some(word => prompt.toLowerCase().includes(word));
            const hasTextOverride = textOverrideWords.some(word => prompt.toLowerCase().includes(word));
            if (hasTextOverride) {
                isImageRequest = false;
            }

            // ==========================================================
            // DEEL 3: AFBEELDING GENERATOR
            // ==========================================================
            if (isImageRequest) {
                const luxuryEnhancement = "hyper-realistic 8k photo, cinematic lighting, corporate luxury style, professional photography, elegant, highly detailed";
                const combinedPrompt = encodeURIComponent(`${prompt}, ${luxuryEnhancement}`);
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
            // DEEL 4: CHAT-AI (STABIELER EN SNELLER VIA GEMINI API GW)
            // ==========================================================
            const systemPrompt = "Je bent Space-GPT binnen de NexSpace Discord server. Hou je antwoorden kort en bondig (maximaal 2-4 zinnen) bij normale vragen. Als de gebruiker vraagt om een verhaal, code of uitgebreide uitleg, geef dan een lang antwoord. Antwoord altijd in het Nederlands.";
            
            // Bouw een schone context zonder dat de URL crasht wegens lengte
            const cleanHistory = conversationHistory.map(h => `${h.role === 'user' ? 'Gebruiker' : 'AI'}: ${h.content}`).join('\n');
            const fullContext = `${systemPrompt}\n\n${cleanHistory}\n\nGebruiker: ${prompt}\nAI:`;

            // We gebruiken een stabielere, snellere publieke Gemini-gateway die NOOIT 'Queue full' errors geeft
            const response = await fetch(`https://open.ai-api.xyz/api/gemini?prompt=${encodeURIComponent(fullContext)}`).catch(() => null);
            
            if (!response || !response.ok) {
                return message.reply('❌ Space-GPT ondervindt momenteel een verbindingsfout. Probeer het over een paar seconden nog eens.');
            }

            const data = await response.json().catch(() => null);
            const reply = data?.response || data?.text || data?.result;

            if (!reply || reply.trim().length === 0) {
                return message.reply('❌ Ik kon geen antwoord genereren. Probeer je vraag anders te formuleren.');
            }

            // Versturen naar Discord (netjes opgeknipt als de tekst te lang is)
            if (reply.length > 2000) {
                const chunks = reply.match(/[\s\S]{1,1900}/g) || [reply];
                for (const chunk of chunks) { 
                    await message.channel.send(chunk).catch(() => null); 
                }
            } else {
                await message.reply(reply);
            }

        } catch (error) {
            console.error('Space-GPT Error:', error);
            await message.reply('❌ Er ging iets mis bij het verwerken van je bericht.');
        }
    }
};
