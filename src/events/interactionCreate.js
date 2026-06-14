import { Events, MessageFlags, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { handleApplicationModal } from '../commands/Community/apply.js';
import { handleApplicationReviewModal } from '../commands/Community/app-admin.js';
import { handleInteractionError, createError, ErrorTypes } from '../utils/errorHandler.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { createInteractionTraceContext, runWithTraceContext } from '../utils/traceContext.js';
import { validateChatInputPayloadOrThrow } from '../utils/commandInputValidation.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';

const tempReviewCache = new Map();

// Globale cache om de status en antwoorden van lopende sollicitaties per gebruiker te onthouden
const actieveSollicitaties = new Map();

// Vragenlijsten voor de DM-sollicitaties
const REGULIERE_VRAGEN = [
    "Wat is je Naam?",
    "Wat is je Motivatie?",
    "Waarom kies je voor ons?",
    "Wat wil jij toevoegen aan onze server?",
    "Hoeveel partners kun je regelen per week?",
    "Heb je nog overige vragen?"
];

const MANAGEMENT_VRAGEN = [
    "Voor welke rol solliciteer je? (Toezicht manager of Administratief manager)",
    "Wat is je Naam?",
    "Wat is je Motivatie?",
    "Waarom kies je voor ons?",
    "Wat wil jij toevoegen aan onze server?",
    "Hoeveel partners kun je regelen per week?",
    "Heb je nog overige vragen?"
];

function withTraceContext(context = {}, traceContext = {}) {
    return {
        traceId: traceContext.traceId,
        guildId: context.guildId || traceContext.guildId,
        userId: context.userId || traceContext.userId,
        command: context.commandName || traceContext.command,
        ...context
    };
}

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        const interactionTraceContext = createInteractionTraceContext(interaction);
        interaction.traceContext = interactionTraceContext;
        interaction.traceId = interactionTraceContext.traceId;

        return runWithTraceContext(interactionTraceContext, async () => {  
            try {  
                InteractionHelper.patchInteractionResponses(interaction);  

                if (interaction.isChatInputCommand()) {  
                    try {  
                        logger.info(`Command executed: /${interaction.commandName} by ${interaction.user.tag}`, {  
                            event: 'interaction.command.received',  
                            traceId: interactionTraceContext.traceId,  
                            guildId: interaction.guildId,  
                            userId: interaction.user?.id,  
                            command: interaction.commandName  
                        });  

                        validateChatInputPayloadOrThrow(interaction, withTraceContext({  
                            type: 'command_input_validation',  
                            commandName: interaction.commandName  
                        }, interactionTraceContext));  

                        const command = client.commands.get(interaction.commandName);  

                        if (!command) {  
                            throw createError(  
                                `No command matching ${interaction.commandName} was found.`,  
                                ErrorTypes.CONFIGURATION,  
                                'Sorry, that command does not exist.',  
                                withTraceContext({ commandName: interaction.commandName }, interactionTraceContext)  
                            );  
                        }  

                        const abuseProtection = await enforceAbuseProtection(interaction, command, interaction.commandName);  
                        if (!abuseProtection.allowed) {  
                            const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);  
                            throw createError(  
                                `Risky command cooldown active for ${interaction.commandName}`,  
                                ErrorTypes.RATE_LIMIT,  
                                `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,  
                                withTraceContext({  
                                    commandName: interaction.commandName,  
                                    subtype: 'command_cooldown',  
                                    expected: true,  
                                    cooldownMs: abuseProtection.remainingMs,  
                                    cooldownWindowMs: abuseProtection.policy?.windowMs,  
                                    cooldownMaxAttempts: abuseProtection.policy?.maxAttempts  
                                }, interactionTraceContext)  
                            );  
                        }  

                        let guildConfig = null;  
                        if (interaction.guild) {  
                            guildConfig = await getGuildConfig(client, interaction.guild.id, interactionTraceContext);  
                            if (guildConfig?.disabledCommands?.[interaction.commandName]) {  
                                throw createError(  
                                    `Command ${interaction.commandName} is disabled in this guild`,  
                                    ErrorTypes.CONFIGURATION,  
                                    'This command has been disabled for this server.',  
                                    withTraceContext({ commandName: interaction.commandName, guildId: interaction.guild.id }, interactionTraceContext)  
                                );  
                            }  
                        }  

                        await command.execute(interaction, guildConfig, client);  
                    } catch (error) {  
                        await handleInteractionError(interaction, error, withTraceContext({  
                            type: 'command',  
                            commandName: interaction.commandName  
                        }, interactionTraceContext));  
                    }  
                } else if (interaction.isAutocomplete()) {  
                    const focusedOption = interaction.options.getFocused(true);  
                    
                    if (interaction.commandName === 'apply' && focusedOption.name === 'application') {  
                        try {  
                            const { getApplicationRoles } = await import('../utils/database.js');  
                            const roles = await getApplicationRoles(client, interaction.guildId);  
                            const roleName = interaction.options.getString('application', false);  
                            
                            const filtered = roles.filter(role =>  
                                role.enabled !== false &&   
                                role.name.toLowerCase().startsWith(roleName?.toLowerCase() || '')  
                            );  
                            
                            await interaction.respond(  
                                filtered.slice(0, 25).map(role => ({  
                                    name: `${role.name}${role.enabled === false ? ' (disabled)' : ''}`,  
                                    value: role.name  
                                }))  
                            );  
                        } catch (error) {  
                            logger.error('Error handling autocomplete:', {  
                                error: error.message,  
                                guildId: interaction.guildId,  
                                commandName: interaction.commandName  
                            });  
                            await interaction.respond([]);  
                        }  
                    } else if (interaction.commandName === 'app-admin' && focusedOption.name === 'application') {  
                        try {  
                            const { getApplicationRoles } = await import('../utils/database.js');  
                            const roles = await getApplicationRoles(client, interaction.guildId);  
                            const appName = interaction.options.getString('application', false);  
                            
                            const filtered = roles.filter(role =>  
                                role.name.toLowerCase().startsWith(appName?.toLowerCase() || '')  
                            );  
                            
                            await interaction.respond(  
                                filtered.slice(0, 25).map(role => ({  
                                    name: `${role.name}${role.enabled === false ? ' (disabled)' : ''}`,  
                                    value: role.name  
                                }))  
                            );  
                        } catch (error) {  
                            logger.error('Error handling app-admin autocomplete:', {  
                                error: error.message,  
                                guildId: interaction.guildId,  
                                commandName: interaction.commandName  
                            });  
                            await interaction.respond([]);  
                        }  
                    } else if (interaction.commandName === 'reactroles' && focusedOption.name === 'panel') {  
                        try {  
                            const { getAllReactionRoleMessages, deleteReactionRoleMessage } = await import('../services/reactionRoleService.js');  
                            const guildId = interaction.guildId;  
                            const guild = interaction.guild;  
                            
                            let panels = await getAllReactionRoleMessages(client, guildId);  
                            
                            if (!panels || panels.length === 0) {  
                                await interaction.respond([]);  
                                return;  
                            }  
                            
                            const validPanels = [];  
                            for (const panel of panels) {  
                                if (!panel.messageId || !panel.channelId) {  
                                    continue;  
                                }  
                                
                                const channel = guild.channels.cache.get(panel.channelId);  
                                if (!channel) {  
                                    await deleteReactionRoleMessage(client, guildId, panel.messageId).catch(() => {});  
                                    continue;  
                                }  
                                
                                const msg = await channel.messages.fetch(panel.messageId).catch(() => null);  
                                if (!msg) {  
                                    await deleteReactionRoleMessage(client, guildId, panel.messageId).catch(() => {});  
                                    continue;  
                                }  
                                validPanels.push(panel);  
                            }  
                            
                            if (validPanels.length === 0) {  
                                await interaction.respond([]);  
                                return;  
                            }  
                            
                            const choices = await Promise.all(  
                                validPanels.slice(0, 25).map(async panel => {  
                                    try {  
                                        const channel = guild.channels.cache.get(panel.channelId);  
                                        if (!channel) return null;  
                                        
                                        const msg = await channel.messages.fetch(panel.messageId).catch(() => null);  
                                        if (!msg) return null;  
                                        
                                        const title = msg?.embeds?.[0]?.title ?? 'Untitled Panel';  
                                        const channelName = channel?.name ?? 'unknown';  
                                        
                                        return {  
                                            name: `${title} (${channelName})`.substring(0, 100),  
                                            value: panel.messageId  
                                        };  
                                    } catch (e) {  
                                        return null;  
                                    }  
                                })  
                            );  
                            
                            const validChoices = choices.filter(c => c !== null);  
                            await interaction.respond(validChoices);  
                        } catch (error) {  
                            logger.error('Error handling reactroles autocomplete:', {  
                                error: error.message,  
                                guildId: interaction.guildId,  
                                commandName: interaction.commandName  
                            });  
                            await interaction.respond([]);  
                        }  
                    }  
                } else if (interaction.isButton()) {  

                    // ==========================================
                    //  WATERDICHT SOLLICITATIE DM SYSTEEM (GEFIXT)
                    // ==========================================
                    if (interaction.customId === 'start_apply_regulier' || interaction.customId === 'start_apply_management') {
                        // Voorkom dat een gebruiker meerdere sessies tegelijk start
                        if (actieveSollicitaties.has(interaction.user.id)) {
                            return interaction.reply({ content: '❌ Je hebt al een actieve sollicitatieprocedure openstaan in je DM! Rond deze eerst af.', flags: [MessageFlags.Ephemeral] });
                        }

                        await interaction.reply({ content: '⏳ We sturen je nu een bericht in je DM om het sollicitatiegesprek te starten!', flags: [MessageFlags.Ephemeral] });

                        const isManagement = interaction.customId === 'start_apply_management';
                        const vacatureNaam = isManagement ? 'Management vacature' : 'Staff vacature';
                        const vragenlijst = isManagement ? MANAGEMENT_VRAGEN : REGULIERE_VRAGEN;

                        try {
                            const dmChannel = await interaction.user.createDM();
                            
                            // Registreer de sessie stabiel in de globale Map cache
                            actieveSollicitaties.set(interaction.user.id, {
                                guild: interaction.guild,
                                vacatureNaam: vacatureNaam,
                                vragenlijst: vragenlijst,
                                huidigeIndex: 0,
                                antwoorden: []
                            });

                            // 1. Stuur de "Application Started" embed
                            const startEmbed = new EmbedBuilder()
                                .setTitle('Application Started')
                                .setDescription('Please answer the questions below by sending a message to the bot.')
                                .setColor('#2ecc71');
                            await dmChannel.send({ embeds: [startEmbed] });

                            // 2. Stuur direct Vraag 1
                            const eersteVraagEmbed = new EmbedBuilder()
                                .setTitle(vacatureNaam)
                                .setDescription(`**1/${vragenlijst.length}.** ${vragenlijst[0]}`)
                                .addFields({ name: '\u200B', value: '*To answer this question, please send a message to the bot with your response.*' })
                                .setColor('#3498db');
                            await dmChannel.send({ embeds: [eersteVraagEmbed] });

                            // 3. Start de stabiele message collector binnen het DM-kanaal
                            const collector = dmChannel.createMessageCollector({
                                filter: m => m.author.id === interaction.user.id && !m.author.bot,
                                time: 600000 // 10 minuten per vraag
                            });

                            collector.on('collect', async (msg) => {
                                try {
                                    const huidigeSessie = actieveSollicitaties.get(interaction.user.id);
                                    if (!huidigeSessie) {
                                        collector.stop('geannuleerd');
                                        return;
                                    }

                                    // Sla het gegeven antwoord op
                                    huidigeSessie.antwoorden.push({
                                        vraag: huidigeSessie.vragenlijst[huidigeSessie.huidigeIndex],
                                        antwoord: msg.content
                                    });

                                    // Verhoog de index veilig via de globale status
                                    huidigeSessie.huidigeIndex++;
                                    actieveSollicitaties.set(interaction.user.id, huidigeSessie);

                                    if (huidigeSessie.huidigeIndex < huidigeSessie.vragenlijst.length) {
                                        // Stuur de volgende vraag op basis van de bijgewerkte index
                                        const volgendeVraagEmbed = new EmbedBuilder()
                                            .setTitle(huidigeSessie.vacatureNaam)
                                            .setDescription(`**${huidigeSessie.huidigeIndex + 1}/${huidigeSessie.vragenlijst.length}.** ${huidigeSessie.vragenlijst[huidigeSessie.huidigeIndex]}`)
                                            .addFields({ name: '\u200B', value: '*To answer this question, please send a message to the bot with your response.*' })
                                            .setColor('#3498db');
                                        
                                        await dmChannel.send({ embeds: [volgendeVraagEmbed] });
                                        collector.resetTimer(); // Reset de 10 minuten limiet voor de nieuwe vraag
                                    } else {
                                        collector.stop('voltooid');
                                    }
                                } catch (error) {
                                    logger.error(`Fout tijdens verzamelen van sollicitatiebericht: ${error.message}`);
                                    collector.stop('fout');
                                }
                            });

                            collector.on('end', async (collected, reason) => {
                                const finaleSessie = actieveSollicitaties.get(interaction.user.id);
                                // Verwijder de gebruiker altijd uit de actieve cache bij beëindiging
                                actieveSollicitaties.delete(interaction.user.id);

                                if (reason === 'voltooid' && finaleSessie) {
                                    const eindEmbed = new EmbedBuilder()
                                        .setTitle('✅ Sollicitatie Afgerond')
                                        .setDescription('Bedankt! Je sollicitatie is succesvol ontvangen door ons management team. Je hoort zo snel mogelijk van ons!')
                                        .setColor('#2ecc71');
                                    await dmChannel.send({ embeds: [eindEmbed] });

                                    // Stuur de opgebouwde review naar het logkanaal van de server
                                    const uitslagenChannel = finaleSessie.guild.channels.cache.find(c => c.name === 'vacatures-uitslagen');
                                    if (!uitslagenChannel) return logger.error('Kanaal vacatures-uitslagen niet gevonden.');

                                    const reviewEmbed = new EmbedBuilder()
                                        .setTitle(`📩 Nieuwe Sollicitatie: ${finaleSessie.vacatureNaam}`)
                                        .setColor('#00fbff')
                                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                                        .setFooter({ text: `Gebruiker ID: ${interaction.user.id}` })
                                        .setTimestamp();

                                    finaleSessie.antwoorden.forEach(a => {
                                        reviewEmbed.addFields({ name: a.vraag, value: a.antwoord || 'Geen antwoord gegeven', inline: false });
                                    });

                                    reviewEmbed.addFields({ name: '👤 Ingediend door', value: `<@${interaction.user.id}> (${interaction.user.username})` });

                                    const beoordeelRij = new ActionRowBuilder().addComponents(
                                        new ButtonBuilder().setCustomId(`app_accept:${interaction.user.id}`).setLabel('Goedkeuren').setStyle(ButtonStyle.Success),
                                        new ButtonBuilder().setCustomId(`app_deny:${interaction.user.id}`).setLabel('Afkeuren').setStyle(ButtonStyle.Danger)
                                    );

                                    await uitslagenChannel.send({ embeds: [reviewEmbed], components: [beoordeelRij] });
                                } else if (reason !== 'geannuleerd') {
                                    const timeoutEmbed = new EmbedBuilder()
                                        .setTitle('❌ Sollicitatie Verlopen')
                                        .setDescription('Je hebt te lang gewacht met antwoorden (maximaal 10 minuten per vraag). Start de sollicitatie opnieuw via de server.')
                                        .setColor('#e74c3c');
                                    await dmChannel.send({ embeds: [timeoutEmbed] }).catch(() => {});
                                }
                            });

                        } catch (err) {
                            actieveSollicitaties.delete(interaction.user.id);
                            logger.error(`Kan geen DM sturen naar gebruiker: ${err.message}`);
                            return interaction.followUp({ content: '❌ Het openen van een DM-gesprek is mislukt. Controleer of je privéberichten openstaan!', flags: [MessageFlags.Ephemeral] });
                        }
                        return;
                    }

                    // Beoordeling: GOEDKEUREN
                    if (interaction.customId.startsWith('app_accept:')) {
                        await interaction.deferUpdate();
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetUser = await client.users.fetch(targetUserId).catch(() => null);

                        if (targetUser) {
                            await targetUser.send('🎉 **Gefeliciteerd!** Je sollicitatie is **goedgekeurd** door het management team.\n\nMaak alsjeblieft een ticket aan in de server voor de verdere afhandeling, extra informatie and om je rollen te claimen!').catch(() => null);
                        }

                        const oldEmbed = interaction.message.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(oldEmbed)
                            .setColor('#00ff66')
                            .setTitle(`${oldEmbed.title} - 🟢 GOEDGEKEURD`)
                            .addFields({ name: '🛡️ Beoordeeld door', value: `<@${interaction.user.id}>` });

                        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
                        return;
                    }

                    // Beoordeling: AFKEUREN
                    if (interaction.customId.startsWith('app_deny:')) {
                        await interaction.deferUpdate();
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetUser = await client.users.fetch(targetUserId).catch(() => null);

                        if (targetUser) {
                            await targetUser.send('🖤 Bedankt voor je interesse en de moeite die je hebt genomen om te solliciteren. Helaas moeten we je mededelen dat je deze keer **niet bent gekozen**.\n\nJammer, maar hopelijk tot een volgende ronde!').catch(() => null);
                        }

                        const oldEmbed = interaction.message.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(oldEmbed)
                            .setColor('#ff0000')
                            .setTitle(`${oldEmbed.title} - 🔴 AFGEKEURD`)
                            .addFields({ name: '🛡️ Beoordeeld door', value: `<@${interaction.user.id}>` });

                        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
                        return;
                    }

                    // Ticket logica
                    if (interaction.customId === 'open_purchase_ticket' || interaction.customId === 'create_ticket' || interaction.customId === 'open_ticket') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        
                        const category = interaction.guild.channels.cache.find(c => 
                            c.type === ChannelType.GuildCategory && 
                            (c.name === '📨 | Tickets Vragen' || c.name === 'Tickets' || c.name === 'MTS Shop Aankopen' || c.name.toLowerCase().includes('ticket'))
                        );

                        if (!category) {
                            return interaction.editReply({ content: '❌ Er is geen geschikte ticket-categorie gevonden (`📨 | Tickets Vragen` bestaat niet). Maak deze eerst aan!' });
                        }

                        const ticketChannel = await interaction.guild.channels.create({
                            name: `🎫-ticket-${interaction.user.username}`,
                            type: ChannelType.GuildText,
                            parent: category.id,
                            permissionOverwrites: [
                                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                            ],
                        });

                        const ticketEmbed = new EmbedBuilder()
                            .setTitle('🎫 SUPPORT TICKET')
                            .setDescription(`Welkom <@${interaction.user.id}>!\n\nHet team is op de hoogte gebracht. Laat hier alvast je vraag of aankoopverzoek achter, dan helpen we je zo snel mogelijk verder!`)
                            .setColor('#00fbff')
                            .setTimestamp();

                        const closeButton = new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒 Sluit Ticket')
                            .setStyle(ButtonStyle.Danger);

                        const row = new ActionRowBuilder().addComponents(closeButton);
                        await ticketChannel.send({ content: `<@${interaction.user.id}> Welkom bij je support ticket!`, embeds: [ticketEmbed], components: [row] });
                        return interaction.editReply({ content: `✅ Je ticket is succesvol aangemaakt! Klik hier om direct te kijken: <#${ticketChannel.id}>` });
                    }

                    if (interaction.customId === 'close_ticket') {
                        await interaction.reply({ content: '🔒 Dit ticket wordt over 5 seconden gesloten...' });
                        setTimeout(async () => {
                            await interaction.channel.delete().catch(() => {});
                        }, 5000);
                        return;
                    }

                    if (interaction.customId.startsWith('shared_todo_')) {  
                        const parts = interaction.customId.split('_');  
                        const buttonType = parts.slice(0, 3).join('_');  
                        const listId = parts[3];  
                        const button = client.buttons.get(buttonType);  

                        if (button) {  
                            try {  
                                await button.execute(interaction, client, [listId]);  
                            } catch (error) {  
                                await handleInteractionError(interaction, error, withTraceContext({  
                                    type: 'button',  
                                    customId: interaction.customId,  
                                    handler: 'todo'  
                                }, interactionTraceContext));  
                            }  
                        } else {  
                            throw createError(  
                                `No button handler found for ${buttonType}`,  
                                ErrorTypes.CONFIGURATION,  
                                'This button is not available.',  
                                withTraceContext({ buttonType }, interactionTraceContext)  
                            );  
                        }  
                        return;  
                    }  

                    const [customId, ...args] = interaction.customId.split(':');  
                    const button = client.buttons.get(customId);  

                    if (!button) {  
                        if (!interaction.customId.includes(':')) {  
                            return;  
                        }  

                        throw createError(  
                            `No button handler found for ${customId}`,  
                            ErrorTypes.CONFIGURATION,  
                            'This button is not available.',  
                            withTraceContext({ customId }, interactionTraceContext)  
                        );  
                    }  

                    try {  
                        await button.execute(interaction, client, args);  
                    } catch (error) {  
                        await handleInteractionError(interaction, error, withTraceContext({  
                            type: 'button',  
                            customId: interaction.customId,  
                            handler: 'general'  
                        }, interactionTraceContext));  
                    }  
                } else if (interaction.isStringSelectMenu()) {  
                    if (interaction.customId === 'review_select_shop' || interaction.customId === 'review_select_stars') {
                        let userChoices = tempReviewCache.get(interaction.user.id) || { shop: null, stars: null };

                        if (interaction.customId === 'review_select_shop') userChoices.shop = interaction.values[0];
                        if (interaction.customId === 'review_select_stars') userChoices.stars = interaction.values[0];

                        tempReviewCache.set(interaction.user.id, userChoices);

                        if (userChoices.shop && userChoices.stars) {
                            const modal = new ModalBuilder()
                                .setCustomId('review_final_modal')
                                .setTitle(`${userChoices.shop === 'mts' ? 'MTS' : 'NexSpace'} Shop Review`);

                            const productInput = new TextInputBuilder()
                                .setCustomId('review_product')
                                .setLabel('Wat heb je gekocht?')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Bijv. Starter Pack, Munten, Custom Rol...')
                                .setRequired(true);

                            const priceInput = new TextInputBuilder()
                                .setCustomId('review_price')
                                .setLabel('Wat was de prijs?')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Bijv. €5,00 of 500 munten')
                                .setRequired(true);

                            const legitInput = new TextInputBuilder()
                                .setCustomId('review_legit')
                                .setLabel('Hoe is de shopervaring verlopen?')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Bijv. Ja, heel snel geholpen en betrouwbaar!')
                                .setRequired(true);

                            modal.addComponents(
                                new ActionRowBuilder().addComponents(productInput),
                                new ActionRowBuilder().addComponents(priceInput),
                                new ActionRowBuilder().addComponents(legitInput)
                            );

                            await interaction.showModal(modal);
                            await interaction.editReply({ content: '⏳ Openen van het formulier...', components: [] }).catch(() => null);
                        } else {
                            await interaction.deferUpdate();
                        }
                        return;
                    }

                    const [customId, ...args] = interaction.customId.split(':');  
                    const selectMenu = client.selectMenus.get(customId);  

                    if (!selectMenu) {  
                        if (!interaction.customId.includes(':')) {  
                            return;  
                        }  

                        throw createError(  
                            `No select menu handler found for ${customId}`,  
                            ErrorTypes.CONFIGURATION,  
                            'This select menu is not available.',  
                            withTraceContext({ customId }, interactionTraceContext)  
                        );  
                    }  

                    try {  
                        await selectMenu.execute(interaction, client, args);  
                    } catch (error) {  
                        await handleInteractionError(interaction, error, withTraceContext({  
                            type: 'select_menu',  
                            customId: interaction.customId  
                        }, interactionTraceContext));  
                    }  
                } else if (interaction.isModalSubmit()) {  
                    
                    if (interaction.customId.startsWith('blacklist_modal:')) {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                        if (!targetMember) return interaction.editReply({ content: '❌ Lid niet gevonden.' });

                        const reason = interaction.fields.getTextInputValue('blacklist_reason') || 'Geen reden opgegeven';
                        const BLACKLIST_ROLE_ID = '1515778132710523021';

                        try {
                            await targetMember.roles.add(BLACKLIST_ROLE_ID);
                        } catch (err) {
                            return interaction.editReply({ content: '❌ Kon de blacklist rol niet toewijzen.' });
                        }

                        const logEmbed = new EmbedBuilder()
                            .setTitle('🚨 MEDEWERKER BLACKLISTED')
                            .setColor('#222222')
                            .addFields(
                                { name: '👤 Medewerker', value: `<@${targetMember.id}>`, inline: true },
                                { name: '📊 Status', value: '`Toegevoegd aan Staff Blacklist`', inline: true },
                                { name: '📄 Reden', value: reason, inline: false },
                                { name: '🛡️ Uitgevoerd Door', value: `<@${interaction.user.id}>`, inline: false }
                            ).setTimestamp();

                        const changelogsChannel = interaction.guild.channels.cache.find(c => c.name === 'changelogs');
                        if (changelogsChannel) await changelogsChannel.send({ embeds: [logEmbed] });
                        return interaction.editReply({ content: '✅ Medewerker is succesvol op de blacklist gezet.' });
                    }

                    if (interaction.customId.startsWith('remove_blacklist_modal:')) {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                        if (!targetMember) return interaction.editReply({ content: '❌ Lid niet gevonden.' });

                        const reason = interaction.fields.getTextInputValue('remove_blacklist_reason') || 'Geen reden opgegeven';
                        const BLACKLIST_ROLE_ID = '1515778132710523021';

                        try {
                            await targetMember.roles.remove(BLACKLIST_ROLE_ID);
                        } catch (err) {
                            return interaction.editReply({ content: '❌ Kon de blacklist rol niet verwijderen.' });
                        }

                        const logEmbed = new EmbedBuilder()
                            .setTitle('🟢 BLACKLIST VERWIJDERD')
                            .setColor('#00ff66')
                            .addFields(
                                { name: '👤 Medewerker', value: `<@${targetMember.id}>`, inline: true },
                                { name: '📊 Status', value: '`Verwijderd van Staff Blacklist`', inline: true },
                                { name: '📄 Reden', value: reason, inline: false },
                                { name: '🛡️ Uitgevoerd Door', value: `<@${interaction.user.id}>`, inline: false }
                            ).setTimestamp();

                        const changelogsChannel = interaction.guild.channels.cache.find(c => c.name === 'changelogs');
                        if (changelogsChannel) await changelogsChannel.send({ embeds: [logEmbed] });
                        return interaction.editReply({ content: '✅ Medewerker is succesvol van de blacklist gehaald.' });
                    }

                    if (interaction.customId.startsWith('warn_intrekken_modal:')) {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetMember = await interaction.guild.members.fetch({ user: targetUserId, force: true }).catch(() => null);
                        if (!targetMember) return interaction.editReply({ content: '❌ Lid niet gevonden.' });

                        const reason = interaction.fields.getTextInputValue('intrekken_reason') || 'Geen reden opgegeven';
                        
                        const STRIKE_1 = '1515778024333774959';
                        const STRIKE_2 = '1515778110174531866';
                        let geschrapteStrike = 'Geen actieve strikes gevonden';

                        try {
                            if (targetMember.roles.cache.has(STRIKE_2)) {
                                await targetMember.roles.remove(STRIKE_2);
                                geschrapteStrike = 'Strike 2 Verwijderd';
                            } else if (targetMember.roles.cache.has(STRIKE_1)) {
                                await targetMember.roles.remove(STRIKE_1);
                                geschrapteStrike = 'Strike 1 Verwijderd';
                            } else {
                                return interaction.editReply({ content: '❌ Deze persoon heeft geen actieve Strike rollen.' });
                            }
                        } catch (err) {
                            return interaction.editReply({ content: '❌ Fout bij het intrekken van de strike rol.' });
                        }

                        const logEmbed = new EmbedBuilder()
                            .setTitle('🛡️ SANCTIE / WARN INGETROKKEN')
                            .setColor('#00aaff')
                            .addFields(
                                { name: '👤 Medewerker', value: `<@${targetMember.id}>`, inline: true },
                                { name: '📊 Actie', value: `\`${geschrapteStrike}\``, inline: true },
                                { name: '📄 Reden van intrekking', value: reason, inline: false },
                                { name: '🛡️ Uitgevoerd Door', value: `<@${interaction.user.id}>`, inline: false }
                            ).setTimestamp();

                        const changelogsChannel = interaction.guild.channels.cache.find(c => c.name === 'changelogs');
                        if (changelogsChannel) await changelogsChannel.send({ embeds: [logEmbed] });
                        return interaction.editReply({ content: `✅ Sanctie succesvol ingetrokken (${geschrapteStrike}).` });
                    }

                    if (interaction.customId === 'update_modal') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const updateTitle = interaction.fields.getTextInputValue('update_title');
                        const updateChanges = interaction.fields.getTextInputValue('update_changes');
                        const updateVersion = interaction.fields.getTextInputValue('update_version') || 'Regulier';

                        const updatesChannel = interaction.guild.channels.cache.find(c => c.name === '┃⚙️・updates');

                        if (!updatesChannel) {
                            return interaction.editReply({ content: '❌ Fout: Het kanaal `┃⚙️・updates` kon niet worden gevonden!' });
                        }

                        const updateEmbed = new EmbedBuilder()
                            .setTitle(`🚀 ${updateTitle.toUpperCase()}`)
                            .setDescription(`Hier is een overzicht van de nieuwste wijzigingen:`)
                            .setColor('#00ffaa') 
                            .addFields(
                                { name: '🛠️ Wijzigingen', value: `${updateChanges}`, inline: false },
                                { name: '📌 Type / Versie', value: `\`${updateVersion}\``, inline: true },
                                { name: '👤 Doorgegeven Door', value: `<@${interaction.user.id}>`, inline: true },
                                { name: '📅 Datum & Tijd', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                            )
                            .setTimestamp();

                        await updatesChannel.send({ embeds: [updateEmbed] });
                        return interaction.editReply({ content: `✅ De update is geplaatst!` });
                    }

                    if (interaction.customId === 'review_final_modal') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const userChoices = tempReviewCache.get(interaction.user.id);
                        if (!userChoices) return interaction.editReply({ content: '❌ Selectie-fout.' });

                        const product = interaction.fields.getTextInputValue('review_product');
                        const price = interaction.fields.getTextInputValue('review_price');
                        const legit = interaction.fields.getTextInputValue('review_legit');

                        let targetChannelName = userChoices.shop === 'mts' ? '┃⭐・reviews' : '┃🌿・proofs';
                        let embedColor = userChoices.shop === 'mts' ? '#ffaa00' : '#00ff66';

                        const reviewChannel = interaction.guild.channels.cache.find(c => c.name === targetChannelName);
                        if (!reviewChannel) return interaction.editReply({ content: `❌ Kanaal ${targetChannelName} niet gevonden.` });

                        const reviewEmbed = new EmbedBuilder()
                            .setTitle(`⭐ NIEUWE ${userChoices.shop.toUpperCase()} REVIEW`)
                            .setColor(embedColor)
                            .addFields(
                                { name: '👤 Koper', value: `<@${interaction.user.id}>`, inline: true },
                                { name: '📦 Product', value: `\`${product}\``, inline: true },
                                { name: '💰 Prijs', value: `\`${price}\``, inline: true },
                                { name: '✅ Legit Check', value: `${legit}`, inline: false },
                                { name: 'Beoordeling', value: `${userChoices.stars}`, inline: false }
                            ).setTimestamp();

                        await reviewChannel.send({ embeds: [reviewEmbed] });
                        tempReviewCache.delete(interaction.user.id); 
                        return interaction.editReply({ content: '✅ Review geplaatst!' });
                    }

                    if (interaction.customId.startsWith('app_modal_')) {  
                        try {  
                            await handleApplicationModal(interaction);  
                        } catch (error) {  
                            await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId }, interactionTraceContext));  
                        }  
                        return;  
                    }  

                    if (interaction.customId.startsWith('app_review_')) {  
                        try {  
                            await handleApplicationReviewModal(interaction);  
                        } catch (error) {  
                            await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId }, interactionTraceContext));  
                        }  
                        return;  
                    }  

                    const [customId, ...args] = interaction.customId.split(':');  
                    const modal = client.modals.get(customId);  

                    if (modal) {  
                        try {  
                            await modal.execute(interaction, client, args);  
                        } catch (error) {  
                            await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId }, interactionTraceContext));  
                        }  
                    }  
                }  
            } catch (error) {  
                logger.error('Unhandled error:', { error, traceId: interactionTraceContext.traceId });  
            }  
        });
    }
};
