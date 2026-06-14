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

// Tijdelijke cache om de shop- en sterrenselectie van gebruikers te onthouden
const tempReviewCache = new Map();

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
                    // Ticket logica met gecorrigeerde categorie-prioriteit
                    if (interaction.customId === 'open_purchase_ticket' || interaction.customId === 'create_ticket' || interaction.customId === 'open_ticket') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        
                        // Zoekt nu EERST naar '📨 | Tickets Vragen', daarna pas naar overige back-ups
                        const category = interaction.guild.channels.cache.find(c => 
                            c.type === ChannelType.GuildCategory && 
                            (c.name === '📨 | Tickets Vragen' || c.name === 'Tickets' || c.name === 'MTS Shop Aankopen' || c.name.toLowerCase().includes('ticket'))
                        );

                        if (!category) {
                            return interaction.editReply({ content: '❌ Er is geen geschikte ticket-categorie gevonden (`📨 | Tickets Vragen` bestaat niet). Maak deze eerst aan!' });
                        }

                        // Maak het ticket-kanaal aan onder de juiste categorie
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
                    // Afhandeling van het Warn / Ontslag formulier (Inclusief Strike & Blacklist rollen)
                    if (interaction.customId.startsWith('warn_modal:')) {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        
                        const targetUserId = interaction.customId.split(':')[1];
                        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                        
                        if (!targetMember) {
                            return interaction.editReply({ content: '❌ Fout: Gebruiker kon niet worden gevonden in deze server!' });
                        }

                        const warnType = interaction.fields.getTextInputValue('warn_type').toLowerCase();
                        const reason = interaction.fields.getTextInputValue('warn_reason');
                        const note = interaction.fields.getTextInputValue('warn_note') || 'Geen extra opmerkingen';
                        
                        // JOUW INGEVULDE ROL ID'S
                        const ROLE_IDS = {
                            STRIKE_1: '1515778024333774959',
                            STRIKE_2: '1515778110174531866',
                            BLACKLIST: '1515778132710523021'
                        };

                        let title = '⚠️ STRATEGIE / SANCTIE UITGEVOERD';
                        let embedColor = '#ffaa00'; 
                        let actieMelding = 'Waarschuwing geregistreerd';
                        let isOntslag = false;

                        // Rol logica op basis van wat je intypt in het formulier
                        try {
                            if (warnType.includes('strike 1')) {
                                await targetMember.roles.add(ROLE_IDS.STRIKE_1);
                                actieMelding = 'Rol `Strike 1` succesvol toegewezen.';
                                embedColor = '#ffaa00';
                            } 
                            else if (warnType.includes('strike 2')) {
                                await targetMember.roles.add(ROLE_IDS.STRIKE_2);
                                actieMelding = 'Rol `Strike 2` succesvol toegewezen.';
                                embedColor = '#ff5500';
                            }
                            else if (warnType.includes('intrek') || warnType.includes('verwijder')) {
                                if (targetMember.roles.cache.has(ROLE_IDS.STRIKE_2)) {
                                    await targetMember.roles.remove(ROLE_IDS.STRIKE_2);
                                    actieMelding = '`Strike 2` ingetrokken / verwijderd.';
                                } else if (targetMember.roles.cache.has(ROLE_IDS.STRIKE_1)) {
                                    await targetMember.roles.remove(ROLE_IDS.STRIKE_1);
                                    actieMelding = '`Strike 1` ingetrokken / verwijderd.';
                                } else {
                                    actieMelding = 'Geen actieve strikes gevonden om te verwijderen.';
                                }
                                embedColor = '#00aaff';
                            }
                            else if (warnType.includes('blacklist toevoeg') || warnType.includes('staff blacklist')) {
                                await targetMember.roles.add(ROLE_IDS.BLACKLIST);
                                actieMelding = 'Medewerker toegevoegd aan de `Staff Blacklist`.';
                                embedColor = '#222222';
                            }
                            else if (warnType.includes('blacklist verwijder')) {
                                await targetMember.roles.remove(ROLE_IDS.BLACKLIST);
                                actieMelding = 'Medewerker verwijderd van de `Staff Blacklist`.';
                                embedColor = '#00ff66';
                            }
                            else if (warnType.includes('ontslag') || warnType.includes('2e')) {
                                title = '🚨 MEDEWERKER ONTSLAGEN';
                                embedColor = '#ff0000';
                                isOntslag = true;
                                actieMelding = 'Medewerker ontslagen en alle staff-rollen gestript.';
                            }
                        } catch (err) {
                            logger.error(`Fout bij het beheren van rollen: ${err.message}`);
                            return interaction.editReply({ content: `❌ Fout bij het aanpassen van de rollen. Controleer of de bot-rol hoog genoeg in de server-lijst staat!` });
                        }

                        const logEmbed = new EmbedBuilder()
                            .setTitle(title)
                            .setColor(embedColor)
                            .addFields(
                                { name: '👤 Medewerker', value: `<@${targetMember.id}>`, inline: true },
                                { name: '📊 Status / Actie', value: `\`${actieMelding}\``, inline: true },
                                { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                                { name: '📄 Reden', value: `${reason}`, inline: false },
                                { name: '💡 Extra Opmerking', value: `${note}`, inline: false },
                                { name: '🛡️ Uitgevoerd Door', value: `<@${interaction.user.id}>`, inline: false }
                            )
                            .setTimestamp();

                        // Als het een ontslag is, strips dan alle normale rollen
                        if (isOntslag) {
                            const rolesToRemove = targetMember.roles.cache.filter(role => 
                                role.id !== interaction.guild.id && 
                                role.managed === false
                            );
                            
                            if (rolesToRemove.size > 0) {
                                await targetMember.roles.remove(rolesToRemove, 'Automatisch gestript wegens ontslag').catch(err => {
                                    logger.error(`Kon rollen niet volledig strippen: ${err.message}`);
                                });
                                logEmbed.setDescription('⚠️ *Alle rollen van dit lid zijn automatisch ingetrokken.*');
                            }
                        }

                        // Stuur naar het updates of changelogs kanaal
                        const changelogsChannel = interaction.guild.channels.cache.find(c => 
                            c.name === '┃⚙️・updates' || 
                            c.name === 'updates' || 
                            c.name === 'changelogs' ||
                            c.name.includes('changelog')
                        );
                        
                        if (!changelogsChannel) {
                            return interaction.editReply({ content: `❌ Fout: Er kon geen geschikt logkanaal gevonden worden!` });
                        }

                        await changelogsChannel.send({ embeds: [logEmbed] });
                        return interaction.editReply({ content: `✅ Actie succesvol verwerkt! ${actieMelding}` });
                    }

                    // Afhandeling van de /update pop-up (Modal) gericht op ┃⚙️・updates
                    if (interaction.customId === 'update_modal') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const updateTitle = interaction.fields.getTextInputValue('update_title');
                        const updateChanges = interaction.fields.getTextInputValue('update_changes');
                        const updateVersion = interaction.fields.getTextInputValue('update_version') || 'Regulier';

                        const changelogsChannel = interaction.guild.channels.cache.find(c => 
                            c.name === '┃⚙️・updates' || 
                            c.name === 'updates' || 
                            c.name === 'changelogs' || 
                            c.name.includes('update')
                        );

                        if (!changelogsChannel) {
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
                                { name: '📅 Datum & Tijd', value: `<t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`, inline: false }
                            )
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                            .setTimestamp()
                            .setFooter({ text: `TitanBot Updates • NexSpace`, iconURL: client.user.displayAvatarURL() });

                        await changelogsChannel.send({ embeds: [updateEmbed] });
                        return interaction.editReply({ content: `✅ De update is succesvol geplaatst in <#${changelogsChannel.id}>!` });
                    }

                    if (interaction.customId === 'review_final_modal') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const userChoices = tempReviewCache.get(interaction.user.id);
                        if (!userChoices) {
                            return interaction.editReply({ content: '❌ Er ging iets mis met je selectie. Typ opnieuw `/review`.' });
                        }

                        const product = interaction.fields.getTextInputValue('review_product');
                        const price = interaction.fields.getTextInputValue('review_price');
                        const legit = interaction.fields.getTextInputValue('review_legit');

                        let targetChannelName = '';
                        let shopName = '';
                        let embedColor = '#00fbff';

                        if (userChoices.shop === 'mts') {
                            targetChannelName = '┃⭐・reviews';
                            shopName = 'MTS Shop';
                            embedColor = '#ffaa00'; 
                        } else {
                            targetChannelName = '┃🌿・proofs';
                            shopName = 'NexSpace Shop';
                            embedColor = '#00ff66'; 
                        }

                        const reviewChannel = interaction.guild.channels.cache.find(c => 
                            c.name === targetChannelName || 
                            c.name === 'reviews' || 
                            c.name === 'proofs' ||
                            c.name.includes(userChoices.shop === 'mts' ? 'review' : 'proof')
                        );

                        if (!reviewChannel) {
                            return interaction.editReply({ content: `❌ Kon het juiste review/proof kanaal voor **${shopName}** niet vinden.` });
                        }

                        const reviewEmbed = new EmbedBuilder()
                            .setTitle(`⭐ NIEUWE ${shopName.toUpperCase()} REVIEW`)
                            .setColor(embedColor)
                            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                            .addFields(
                                { name: '👤 Koper', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                                { name: '📦 Product', value: `\`${product}\``, inline: true },
                                { name: '💰 Prijs', value: `\`${price}\``, inline: true },
                                { name: '✅ Legit Check & Ervaring', value: `${legit}`, inline: false },
                                { name: 'Beoordeling', value: `${userChoices.stars}`, inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Bedankt voor je review bij ${shopName}!`, iconURL: interaction.guild.iconURL() });

                        await reviewChannel.send({ embeds: [reviewEmbed] });
                        tempReviewCache.delete(interaction.user.id); 

                        return interaction.editReply({ content: `✅ Je review is succesvol geplaatst in <#${reviewChannel.id}>!` });
                    }

                    if (interaction.customId.startsWith('app_modal_')) {  
                        try {  
                            await handleApplicationModal(interaction);  
                        } catch (error) {  
                            await handleInteractionError(interaction, error, withTraceContext({  
                                type: 'modal',  
                                customId: interaction.customId,  
                                handler: 'application'  
                            }, interactionTraceContext));  
                        }  
                        return;  
                    }  

                    if (interaction.customId.startsWith('app_review_')) {  
                        try {  
                            await handleApplicationReviewModal(interaction);  
                        } catch (error) {  
                            await handleInteractionError(interaction, error, withTraceContext({  
                                type: 'modal',  
                                customId: interaction.customId,  
                                handler: 'application_review'  
                            }, interactionTraceContext));  
                        }  
                        return;  
                    }  

                    if (interaction.customId.startsWith('jtc_')) {  
                        logger.debug(`Skipping modal handler lookup for inline-awaited modal: ${interaction.customId}`, {  
                          event: 'interaction.modal.inline_skipped',  
                          traceId: interactionTraceContext.traceId  
                        });  
                        return;  
                    }  

                    const [customId, ...args] = interaction.customId.split(':');  
                    const modal = client.modals.get(customId);  

                    if (!modal) {  
                        if (!interaction.customId.includes(':')) {  
                            return;  
                        }  

                        throw createError(  
                            `No modal handler found for ${customId}`,  
                            ErrorTypes.CONFIGURATION,  
                            'This form is not available.',  
                            withTraceContext({ customId }, interactionTraceContext)  
                        );  
                    }  

                    try {  
                        await modal.execute(interaction, client, args);  
                    } catch (error) {  
                        await handleInteractionError(interaction, error, withTraceContext({  
                            type: 'modal',  
                            customId: interaction.customId,  
                            handler: 'general'  
                        }, interactionTraceContext));  
                    }  
                }  
            } catch (error) {  
                logger.error('Unhandled error in interactionCreate:', {  
                    event: 'interaction.unhandled_error',  
                    errorCode: 'INTERACTION_UNHANDLED_ERROR',  
                    error,  
                    traceId: interactionTraceContext.traceId,  
                    interactionId: interaction.id,  
                    guildId: interaction.guildId,  
                    userId: interaction.user?.id  
                });  

                try {  
                    const ephemeralErrorMessage = {  
                        embeds: [MessageTemplates.ERRORS.DATABASE_ERROR('processing your interaction')],  
                        flags: MessageFlags.Ephemeral  
                    };  
                    const editErrorMessage = {  
                        embeds: [MessageTemplates.ERRORS.DATABASE_ERROR('processing your interaction')]  
                    };  

                    if (interaction.deferred) {  
                        await interaction.editReply(editErrorMessage);  
                    } else if (interaction.replied) {  
                        await interaction.followUp(ephemeralErrorMessage);  
                    } else {  
                        await interaction.reply(ephemeralErrorMessage);  
                    }  
                } catch (replyError) {  
                    logger.error('Failed to send fallback error response:', {  
                        event: 'interaction.error_response_failed',  
                        errorCode: 'INTERACTION_ERROR_RESPONSE_FAILED',  
                        error: replyError,  
                        traceId: interactionTraceContext.traceId  
                    });  
                }  
            }  
        });
    }
};
