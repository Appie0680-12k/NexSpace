import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { activeApps } from './interactionCreate.js'; // Let op: controleer of interactionCreate.js in dezelfde map staat!

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Bots negeren we altijd
        if (message.author.bot) return;

        // --- 1. PRIVÉBERICHTEN (DMs) AFHANDELING VOOR SOLLICITATIES ---
        if (!message.guild) {
            const session = activeApps.get(message.author.id);
            if (!session) return; // Geen actieve sollicitatie? Doe niks met de DM.

            session.lastActive = Date.now();
            session.antwoorden.push({
                vraag: session.vragen[session.index],
                antwoord: message.content
            });
            session.index++;

            if (session.index < session.vragen.length) {
                // Volgende vraag sturen
                const volgendeVraagEmbed = new EmbedBuilder()
                    .setTitle(session.vacature)
                    .setDescription(`**${session.index + 1}/${session.vragen.length}.** ${session.vragen[session.index]}`)
                    .addFields({ name: '\u200B', value: '*Typ je antwoord in deze chat.*' })
                    .setColor('#3498db');
                
                await message.channel.send({ embeds: [volgendeVraagEmbed] });
            } else {
                // Klaar! Verwijder uit de tijdelijke cache
                activeApps.delete(message.author.id);

                const eindEmbed = new EmbedBuilder()
                    .setTitle('✅ Sollicitatie Afgerond')
                    .setDescription('Bedankt! Je sollicitatie is succesvol ontvangen door ons management team.')
                    .setColor('#2ecc71');
                await message.channel.send({ embeds: [eindEmbed] });

                // Stuur het resultaat naar de server
                const guild = client.guilds.cache.get(session.guildId);
                if (guild) {
                    const uitslagenChannel = guild.channels.cache.find(c => c.name === 'vacatures-uitslagen');
                    if (uitslagenChannel) {
                        const reviewEmbed = new EmbedBuilder()
                            .setTitle(`📩 Nieuwe Sollicitatie: ${session.vacature}`)
                            .setColor('#00fbff')
                            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();

                        session.antwoorden.forEach(a => {
                            reviewEmbed.addFields({ name: a.vraag, value: a.antwoord || 'Geen antwoord gegeven', inline: false });
                        });
                        reviewEmbed.addFields({ name: '👤 Ingediend door', value: `<@${message.author.id}> (${message.author.username})` });

                        const beoordeelRij = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`app_accept:${message.author.id}`).setLabel('Goedkeuren').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId(`app_deny:${message.author.id}`).setLabel('Afkeuren').setStyle(ButtonStyle.Danger)
                        );

                        await uitslagenChannel.send({ embeds: [reviewEmbed], components: [beoordeelRij] });
                    }
                }
            }
            return; // Zorg dat de code hieronder niet runt voor DMs
        }

        // --- 2. SERVERBERICHTEN AFHANDELING (PREFIX COMMANDOS) ---
        const prefix = '!'; 
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName) || 
                            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (command) await command.execute(message, args);
        }

        // De andere bestanden (zoals premiumCounting.js en partnerEngine.js) 
        // vangen het bericht nu zelf op omdat ze ook op 'messageCreate' staan.
    }
};
