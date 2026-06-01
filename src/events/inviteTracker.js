import { Collection, EmbedBuilder } from 'discord.js';

const invitesCache = new Collection();

export default {
    name: 'guildMemberAdd',
    once: false,

    async execute(member, client) {
        const { guild } = member;

        console.log(`[INVITE] ${member.user.tag} joined`);

        try {

            // Eerste keer cache maken
            if (!invitesCache.has(guild.id)) {
                const invites = await guild.invites.fetch();

                invitesCache.set(
                    guild.id,
                    new Collection(invites.map(inv => [inv.code, inv.uses]))
                );
            }

            const oldInvites = invitesCache.get(guild.id);

            const newInvites = await guild.invites.fetch();

            // Zoek invite die gebruikt is
            const usedInvite = newInvites.find(inv => {
                const oldUses = oldInvites.get(inv.code) || 0;
                return inv.uses > oldUses;
            });

            // Cache updaten
            invitesCache.set(
                guild.id,
                new Collection(newInvites.map(inv => [inv.code, inv.uses]))
            );

            if (!usedInvite || !usedInvite.inviter) return;

            const inviter = usedInvite.inviter;

            // Database stats
            const dbKey = `invites:${guild.id}:${inviter.id}`;

            const currentStats =
                (await client.db.get(dbKey)) || {
                    joins: 0,
                    leaves: 0
                };

            currentStats.joins += 1;

            await client.db.set(dbKey, currentStats);

            // Opslaan wie invited is
            await client.db.set(
                `invited-by:${guild.id}:${member.id}`,
                inviter.id
            );

            console.log(
                `[DATABASE] ${member.user.tag} invited by ${inviter.tag}`
            );

            // Log kanaal
            const channel = guild.channels.cache.get('1499356353460834384');

            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('📥 Nieuw Lid')
                    .setColor('#00fbff')
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
                            value: `${currentStats.joins}`,
                            inline: true
                        }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
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
