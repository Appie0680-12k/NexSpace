import { Events, MessageFlags, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
