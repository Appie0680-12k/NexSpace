import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { OpenAI } from 'openai';
import 'dotenv/config';

// Initialiseer OpenAI (Zorg dat OPENAI_API_KEY in je Railway variables staat!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // --- HANDMATIGE ACTIVATIE VAN DE KNOP (Typ !setup-gpt als Admin) ---
        if (message.content === '!setup-gpt' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setTitle('🧠 NexSpace Intelligence Portal')
                .setDescription('Klik op de onderstaande knop om een beveiligde privé-sessie met **Space-GPT** te starten. Stel vragen, analyseer documenten of genereer afbeeldingen.')
                .setColor('#00fbff')
                .setFooter({ text: 'NexSpace Premium AI Services' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_gpt_session')
                    .setLabel('Start Privé AI Chat')
                    .setEmoji('🤖')
                    .setStyle(ButtonStyle.Premium)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            return message.delete().catch(() => null);
        }

        // --- AI ANTWOORD LOGICA IN HET PRIVÉ KANAAL ---
        if (message.channel.name?.startsWith('gpt-')) {
            // Laat de bot zien dat hij typt
            await message.channel.sendTyping();

            const prompt = message.content;

            // Check of de gebruiker vraagt om een afbeelding te maken
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
                    return message.reply('❌ Er ging iets mis bij het genereren van de afbeelding. Probeer de beschrijving aan te passen.');
                }
            }

            // Normale tekstvraag (ChatGPT)
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini", // Snel, modern en slim model
                    messages: [
                        { role: "system", content: "Je bent Space-GPT, een exclusieve AI-assistent binnen de NexSpace Discord server. Je helpt volwassenen, ondernemers en beheerders met diepgaande antwoorden, adviezen, samenvattingen en analyses. Reageer professioneel maar vlot in het Nederlands." },
                        { role: "user", content: prompt }
                    ],
                });

                const reply = completion.choices[0].message.content;
                
                // Als het antwoord erg lang is, splitsen we het op (Discord limiet is 2000 tekens)
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) {
                        await message.reply(chunk);
                    }
                } else {
                    await message.reply(reply);
                }
            } catch (error) {
                console.error(error);
                await message.reply('❌ Space-GPT kon je vraag op dit moment niet verwerken.');
            }
        }
    }
};

// --- INTERACTIE HANDLER VOOR DE KNOP ---
export { Events as InteractionEvents };
export const interactionHandler = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'start_gpt_session') {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const channelName = `gpt-${interaction.user.username}`;

            // Check of deze persoon al een kanaal heeft openstaan
            const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
            if (existingChannel) {
                return interaction.editReply({ content: `❌ Je hebt al een actieve sessie! Ga naar ${existingChannel}`, ephemeral: true });
            }

            // Maak het privé-kanaal aan (Alleen zichtbaar voor de gebruiker en de rollen met Administrator rechten)
            const gptChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel], // Verberg voor iedereen
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Toestaan voor de speler
                    },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🤖 Space-GPT Privé Console')
                .setDescription(`Welkom <@${interaction.user.id}>! Dit kanaal is volledig privé tussen jou en de servereigenaren.\n\n**Wat kan je hier doen?**\n• Stel complexe business- of levensvragen.\n• Vraag om code, teksten of samenvattingen.\n• Typ bijvoorbeeld: *"Maak een afbeelding van een futuristische skyline"* om AI kunst te creëren.`)
                .setColor('#00fbff')
                .setFooter({ text: 'Typ je bericht om te beginnen. Sluit het kanaal handmatig als je klaar bent.' });

            await gptChannel.send({ embeds: [welcomeEmbed] });
            await interaction.editReply({ content: `✅ Je privé AI chat is aangemaakt! Klik hier: ${gptChannel}`, ephemeral: true });
        }
    }
};
