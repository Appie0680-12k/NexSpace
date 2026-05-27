import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { OpenAI } from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- HANDMATIGE ACTIVATIE VAN DE KNOP ---
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

        // --- AI ANTWOORD LOGICA IN PRIVÉ KANAAL ---
        if (message.channel.name?.startsWith('gpt-')) {
            await message.channel.sendTyping();
            const prompt = message.content;

            // Afbeelding genereren
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
                    return message.reply('❌ Er ging iets mis bij het genereren van de afbeelding.');
                }
            }

            // Normale tekstvraag
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Je bent Space-GPT, een exclusieve AI-assistent binnen de NexSpace Discord server. Reageer professioneel in het Nederlands." },
                        { role: "user", content: prompt }
                    ],
                });

                const reply = completion.choices[0].message.content;
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) { await message.reply(chunk); }
                } else {
                    await message.reply(reply);
                }
            } catch (error) {
                console.error(error);
                await message.reply('❌ Space-GPT kon je vraag niet verwerken.');
            }
        }
    }
};
