import { Collection, EmbedBuilder } from 'discord.js';

// Hier slaan we alle invites in het tijdelijke geheugen op voor de vergelijking
const invitesCache = new Collection();

export default {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        const { guild } = member;
        console.log(`[INVITE] ${member.user.tag} joint, database-tracker starten...`);
        
        try {
            // Cache vullen als deze leeg is
            if (!invitesCache.has(guild.id)) {
                const initialInvites = await guild.invites.fetch();
                invitesCache.set(guild.id, new Collection(initialInvites.map(inv => [inv.code, inv.uses])));
            }

            const newInvites = await guild.invites.fetch();
            const oldInvites = invitesCache.get(guild.id);
            
            // Zoek welke code is gestegen
            const usedInvite = newInvites.find(inv => oldInvites && oldInvites.get(inv.code) < inv.uses);
            
            // Update cache direct
            invitesCache.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));
            
            if (usedInvite && usedInvite.inviter) {
                const inviter = usedInvite.inviter;
                
                if (client.db) {
                    // Koppel het nieuwe lid aan de uitnodiger in de database
                    const inviteKey = `invited-by:${guild.id}:${member.user.id}`;
                    await client.db.set(inviteKey, inviter.id);

                    // Update de statistieken van de uitnodiger (+1 join)
                    const dbKey = `invites:${guild.id}:${inviter.id}`;
                    const currentStats = (await client.db.get(dbKey)) || { joins: 0, leaves: 0 };
                    
                    currentStats.joins += 1;
                    await client.db.set(dbKey, currentStats);

                    console.log(`[DATABASE] ${member.user.tag} opgeslagen onder inviter ${inviter.tag}. Joins nu: ${currentStats.joins}`);
                }

                // Jouw specifieke Kanaal-ID is hier nu gekoppeld:
                const logChannelId = '1499356353460834384'; 
                const channel = guild.channels.cache.get(logChannelId);
                
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('📥 Nieuw Lid Geregistreerd')
                        .setDescription(`Welkom <@${member.user.id}> in de server!`)
                        .setColor('#00fbff')
                        .addFields(
                            { name: '👤 Gebruiker', value: `${member.user.tag}`, inline: true },
                            { name: '✉️ Genodigd door', value: `<@${inviter.id}>`, inline: true },
                            { name: '🔗 Code', value: `\`${usedInvite.code}\``, inline: true }
                        )
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
            
        } catch (error) {
            console.error('[INVITE ERROR] Fout tijdens join tracker:', error.message);
        }
    }
};
