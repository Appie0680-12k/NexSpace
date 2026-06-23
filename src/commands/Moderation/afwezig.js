import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('afwezig')
        .setDescription('Meld jezelf afwezig binnen de server (Alleen voor Team Nexspace).'),

    async execute(interaction, guildConfig, client) {
        const teamRolId = '1475602329301684315'; // Team Nexspace Rol ID

        // 1. Controleer of de persoon die het commando typt wel in Team Nexspace zit
        if (!interaction.member.roles.cache.has(teamRolId)) {
            return await interaction.reply({ 
                content: '❌ Dit commando is exclusief voor leden met de **Team Nexspace** rol.', 
                ephemeral: true 
            });
        }

        // Maak de pop-up aan
        const modal = new ModalBuilder()
            .setCustomId('afwezig_modal')
            .setTitle('Formulier: Afwezigheidsverzoek');

        // Vraag 1: Functie / Rol
        const rolInput = new TextInputBuilder()
            .setCustomId('afwezig_rol')
            .setLabel('Functie / Rol binnen NexSpace')
            .setPlaceholder('Bijv: Moderator, Developer, Event Manager')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Vraag 2: Periode + Terugkeerdatum
        const periodeInput = new TextInputBuilder()
            .setCustomId('afwezig_periode')
            .setLabel('Periode & Verwachte terugkeerdatum')
            .setPlaceholder('Bijv: 24 juni t/m 5 juli (Terug op 6 juli)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Vraag 3: Reden (Verplicht!)
        const redenInput = new TextInputBuilder()
            .setCustomId('afwezig_reden')
            .setLabel('Reden van afwezigheid (Verplicht)')
            .setPlaceholder('Geef hier een duidelijke reden op waarom je afwezig bent...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Vraag 4: Vervanging nodig? (Ja / Nee)
        const vervangInput = new TextInputBuilder()
            .setCustomId('afwezig_vervanging')
            .setLabel('Vervanging nodig? (Ja / Nee)')
            .setPlaceholder('Typ Ja of Nee (+ eventueel toelichting)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Vraag 5: Opmerkingen (Optioneel)
        const opmerkingInput = new TextInputBuilder()
            .setCustomId('afwezig_opmerkingen')
            .setLabel('Eventuele extra opmerkingen')
            .setPlaceholder('Bijv: Ik ben wel bereikbaar voor noodgevallen via DM.')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        // Voeg alle velden toe aan de pop-up
        modal.addComponents(
            new ActionRowBuilder().addComponents(rolInput),
            new ActionRowBuilder().addComponents(periodeInput),
            new ActionRowBuilder().addComponents(redenInput),
            new ActionRowBuilder().addComponents(vervangInput),
            new ActionRowBuilder().addComponents(opmerkingInput)
        );

        // Toon de pop-up aan de gebruiker
        await interaction.showModal(modal);

        // Opvangen van de pop-up data
        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 600000,
                filter: i => i.customId === 'afwezig_modal' && i.user.id === interaction.user.id,
            });

            await submitted.deferReply({ ephemeral: true });

            // Data ophalen uit de pop-up
            const rol = submitted.fields.getTextInputValue('afwezig_rol');
            const periode = submitted.fields.getTextInputValue('afwezig_periode');
            const reden = submitted.fields.getTextInputValue('afwezig_reden');
            const vervanging = submitted.fields.getTextInputValue('afwezig_vervanging');
            const opmerkingen = submitted.fields.getTextInputValue('afwezig_opmerkingen') || '*Geen opmerkingen toegevoegd.*';

            const targetChannel = interaction.guild.channels.cache.find(c => c.name.includes('afwezigheid'));
            if (!targetChannel) {
                return await submitted.editReply({ content: '❌ Kon het kanaal `#afwezigheid` niet vinden.' });
            }

            const afgemeldRolId = '1519075739964669972';
            const member = interaction.member;

            // Geef de rol direct aan de persoon die afwezig gaat
            try {
                await member.roles.add(afgemeldRolId);
            } catch (roleErr) {
                console.log('Kon de rol niet toewijzen wegens rechten-restricties.');
            }

            // Prachtige Embed opbouwen
            const afwezigEmbed = new EmbedBuilder()
                .setTitle('📝 Nieuw Afwezigheidsverzoek')
                .setColor('#ff3333')
                .setDescription(`Een lid van het NexSpace team heeft zich zojuist afgemeld.`)
                .addFields(
                    { name: '👤 Discord Naam', value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true },
                    { name: '💼 Functie / Rol', value: rol, inline: true },
                    { name: '📅 Periode van afwezigheid', value: periode, inline: false },
                    { name: '❓ Reden', value: reden, inline: false },
                    { name: '🔄 Vervanging nodig?', value: vervanging, inline: true },
                    { name: '💬 Opmerkingen', value: opmerkingen, inline: false },
                    { name: '📌 Status', value: '🔴 **Lopend**', inline: false }
                )
                .setFooter({ text: `NexSpace Administratie`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Knoppen voor het BEHEER om het af te ronden
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`afwezig_terug_${interaction.user.id}`)
                    .setLabel('🟢 Teruggekeerd')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`afwezig_annuleer_${interaction.user.id}`)
                    .setLabel('❌ Annuleren')
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await targetChannel.send({ embeds: [afwezigEmbed], components: [buttonRow] });
            await submitted.editReply({ content: '✅ Je afwezigheidsverzoek is ingediend en de rol **Afgemeld** is aan je toegewezen!' });

            // Knoppen-afhandeling (Collector)
            const buttonCollector = msg.createMessageComponentCollector({ time: 2592000000 }); // Blijft 30 dagen actief

            buttonCollector.on('collect', async btnInteraction => {
                // 2. Alleen BEHEER (mensen die rollen kunnen beheren) mag op de knoppen drukken
                if (!btnInteraction.member.permissions.has('ManageRoles')) {
                    return await btnInteraction.reply({ 
                        content: '❌ Alleen het **Beheer** mag dit afwezigheidsverzoek goedkeuren of afhandelen.', 
                        ephemeral: true 
                    });
                }

                const customId = btnInteraction.customId;
                const targetUserId = customId.split('_')[2];
                const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

                if (customId.startsWith('afwezig_terug_')) {
                    await btnInteraction.deferUpdate();

                    // Wijzig embed naar afgelopen
                    const updatedEmbed = EmbedBuilder.from(msg.embeds[0])
                        .setColor('#33ff33')
                        .fields.map(f => f.name === '📌 Status' ? { name: '📌 Status', value: '🟢 **Afgelopen**', inline: false } : f);
                    
                    const newEmbed = new EmbedBuilder(msg.embeds[0]).setFields(updatedEmbed);

                    // Verwijder de rol bij de persoon en tag hem/haar
                    if (targetMember) {
                        try {
                            await targetMember.roles.remove(afgemeldRolId);
                            await targetChannel.send({ content: `👋 Welkom terug ${targetMember}! Vanaf nu word je verwacht weer volledig actief deel te nemen aan de server. Je **Afgemeld** rol is verwijderd door het Beheer.` });
                        } catch (e) {
                            console.log('Kon rol niet verwijderen of lid taggen.');
                        }
                    }

                    await msg.edit({ embeds: [newEmbed], components: [] });
                    buttonCollector.stop();
                }

                if (customId.startsWith('afwezig_annuleer_')) {
                    await btnInteraction.deferUpdate();
                    
                    const updatedEmbed = EmbedBuilder.from(msg.embeds[0])
                        .setColor('#1a1a1a')
                        .fields.map(f => f.name === '📌 Status' ? { name: '📌 Status', value: '⚪ **Geannuleerd / Voortijdig Beëindigd**', inline: false } : f);
                    
                    const newEmbed = new EmbedBuilder(msg.embeds[0]).setFields(updatedEmbed);

                    if (targetMember) {
                        try { await targetMember.roles.remove(afgemeldRolId); } catch (e) {}
                    }

                    await msg.edit({ embeds: [newEmbed], components: [] });
                    buttonCollector.stop();
                }
            });

        } catch (err) {
            console.log('Afwezigheid pop-up timeout of gesloten:', err);
        }
    }
};
