import { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';

// Lokale cooldown tracker (Geen database nodig!)
const userCooldowns = new Map();

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // ==========================================================
        // DEEL 1: LOGICA VOOR DE "START PRIVÉ AI CHAT" KNOP
        // ==========================================================
        if (interaction.isButton() && interaction.customId === 'start_gpt_session') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                const channelName = `gpt-${interaction.user.username}`;

                const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
                if (existingChannel) {
                    return await interaction.editReply({ content: `❌ Je hebt al een actieve sessie! Ga naar ${existingChannel}` });
                }

                const gptChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🤖 Space-GPT Privé Console')
                    .setDescription(`Welkom <@${interaction.user.id}>! Dit kanaal is volledig privé tussen jou en de servereigenaren.\n\n**Wat kan je hier doen?**\n• Stel complexe business- of levensvragen.\n• Vraag om code, teksten of samenvattingen.\n• Typ bijvoorbeeld: *"maak een afbeelding van een hond"* om AI kunst te creëren.`)
                    .setColor('#00fbff')
                    .setFooter({ text: 'Typ je bericht om te beginnen.' });

                await gptChannel.send({ embeds: [welcomeEmbed] });
                return await interaction.editReply({ content: `✅ Je privé AI chat is aangemaakt! Klik hier: ${gptChannel}` });

            } catch (error) {
                console.error('Fout bij aanmaken gpt kanaal:', error);
                return await interaction.editReply({ content: '❌ Er ging iets mis bij het aanmaken van je privé-kanaal.' });
            }
        }
    }
};

// ==========================================================
// DEEL 2: CHAT LOGICA (GEMINI & POLLINATIONS AFBEELDINGEN)
// ==========================================================
export { Events as MessageEvent };

// We luisteren hier naar elk bericht dat in een gpt-kanaal wordt getypt
export const messageCreateHandler = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return; // Negeren als het een bot is
        if (!message.channel.name.startsWith('gpt-')) return; // Alleen in gpt-kanalen werken

        const userId = message.author.id;
        const now = Date.now();

        // Anti-spam cooldown check (3 seconden) via lokaal geheugen
        if (userCooldowns.has(userId)) {
            const expirationTime = userCooldowns.get(userId) + 3000;
            if (now < expirationTime) {
                return message.reply({ content: '❌ Space-GPT verwerkt momenteel een aanvraag voor je. Probeer het over 3 seconden nog eens.' }).then(m => setTimeout(() => m.delete().catch(() => null), 3000));
            }
        }
        userCooldowns.set(userId, now);

        // Laat de bot zien dat hij aan het typen is
        await message.channel.sendTyping();

        const prompt = message.content.trim();

        // --- TRAJECT A: AFBEELDING GENEREREN ---
        const imageKeywords = ['maak een afbeelding', 'maak een foto', 'genereer', 'image', 'picture', 'draw', 'teken'];
        const IsImageRequest = imageKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

        if (IsImageRequest) {
            try {
                const cleanPrompt = encodeURIComponent(prompt.replace(/(maak een afbeelding van|maak een foto van|genereer|image|picture|draw|teken)/gi, '').trim());
                const imageUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=1080&height=1080&nologo=true`;

                const imageEmbed = new EmbedBuilder()
                    .setTitle('🎨 Jouw AI Kunstwerk')
                    .setDescription(`**Prompt:** ${prompt}`)
                    .setImage(imageUrl)
                    .setColor('#00fbff')
                    .setFooter({ text: `Gegenereerd voor ${message.author.username}` });

                return await message.reply({ embeds: [imageEmbed] });
            } catch (err) {
                return await message.reply({ content: '❌ Het is helaas niet gelukt om de afbeelding te genereren.' });
            }
        }

        // --- TRAJECT B: TEXT CHAT (GEMINI AI) ---
        try {
            // We gebruiken de gratis en supersnelle Gemini API via een publieke endpoint (geen API-key vereist voor deze gateway!)
            const response = await fetch(`https://open.ai-api.xyz/api/gemini?prompt=${encodeURIComponent(prompt)}`).catch(() => null);
            
            if (!response || !response.ok) {
                return await message.reply({ content: '❌ De AI-service is momenteel offline. Probeer het later nog eens.' });
            }

            const data = await response.json().catch(() => null);
            const aiAnswer = data?.response || data?.text || data?.result;

            if (!aiAnswer) {
                return await message.reply({ content: '❌ Ik ontving een leeg antwoord van de AI. Probeer je vraag anders te formuleren.' });
            }

            // Als het antwoord te lang is voor 1 Discord bericht (max 2000 tekens), knippen we hem netjes af
            if (aiAnswer.length > 2000) {
                const chunks = aiAnswer.match(/[\s\S]{1,1950}/g) || [aiAnswer];
                for (const chunk of chunks) {
                    await message.channel.send(chunk).catch(() => null);
                }
            } else {
                await message.reply({ content: aiAnswer });
            }

        } catch (error) {
            console.error('Gemini Chat Error:', error);
            await message.reply({ content: '❌ Er is een interne fout opgetreden bij het verwerken van je vraag.' });
        }
    }
};
