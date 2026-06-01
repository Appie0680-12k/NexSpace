import { Collection, EmbedBuilder } from 'discord.js';

export const invitesCache = new Collection();

export default {
    name: 'guildMemberAdd',
    once: false,

    async execute(member, client) {

        const guild = member.guild;

        try {

            const oldInvites = invitesCache.get(guild.id);

            const newInvites = await guild.invites.fetch();

            const usedInvite = newInvites.find(inv => {
                const oldUses = oldInvites?.get(inv.code) || 0;
                return inv.uses > oldUses;
            });

            // cache updaten
            invitesCache.set(
                guild.id,
                new Collection(
                    newInvites.map(inv => [inv.code, inv.uses])
                )
            );

            if (!usedInvite || !usedInvite.inviter) return;

            const inviter = usedInvite.inviter;

            // database key
            const dbKey = `invites:${guild.id}:${inviter.id}`;

            const stats =
                (await client.db.get(dbKey)) || {
                    joins: 0,
                    leaves: 0
                };

            stats.joins += 1;

            await client.db.set(dbKey, stats);

            // opslaan wie invited is
            await client.db.set(
                `invited-by:${guild.id}:${member.id}`,
                inviter.id
            );

            console.log(
                `[INVITE] ${member.user.tag} joined via ${inviter.tag}`
            );

            // LOG CHANNEL
            const logChannelId = '1499356353460834384';

            const channel =
                guild.channels.cache.get(logChannelId);

            if (channel) {

                const embed = new EmbedBuilder()
                    .setColor('#00fbff')
                    .setTitle('📥 Nieuw Lid')
                    .setDescription(
                        `${member} is gejoint via ${inviter}`
                    )
                    .addFields(
                        {
                            name: 'Invite Code',
                            value: `\`${usedInvite.code}\``,
                            inline: true
                        },
                        {
                            name: 'Totaal Invites',
                            value: `${stats.joins - stats.leaves}`,
                            inline: true
                        }
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL()
                    )
                    .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

        } catch (err) {
            console.error('[INVITE ERROR]', err);
        }
    }
};
