import { Collection } from 'discord.js';

// Hier slaan we alle invites in het geheugen op
const invitesCache = new Collection();

export default {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        const { guild } = member;
        console.log(`[INVITE] ${member.user.tag} joint de server, invite checken...`);
        
        try {
            // Als de cache voor deze server nog leeg is, vullen we hem nu snel eerst op
            if (!invitesCache.has(guild.id)) {
                const initialInvites = await guild.invites.fetch();
                invitesCache.set(guild.id, new Collection(initialInvites.map(inv => [inv.code, inv.uses])));
            }

            // Haal de nieuwe status van de invites op uit de Discord API
            const newInvites = await guild.invites.fetch();
            // Haal de oude status uit ons geheugen
            const oldInvites = invitesCache.get(guild.id);
            
            // Zoek de invite waarvan de 'uses' (teller) omhoog is gegaan
            const usedInvite = newInvites.find(inv => oldInvites && oldInvites.get(inv.code) < inv.uses);
            
            // Update direct de cache voor de volgende keer
            invitesCache.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));
            
            if (usedInvite) {
                console.log(`[JOIN] ${member.user.tag} is gejoined met invite code ${usedInvite.code} van ${usedInvite.inviter?.tag || 'Onbekend'}`);
                
                // HIER KAN JE BOT EVENTUEEL EEN BERICHT STUREN IN EEN LOG-KANAAL:
                // bijv: const channel = guild.channels.cache.get('JE_CHANNEL_ID');
                // channel.send(`${member.user.tag} is binnen via code ${usedInvite.code}!`);
            }
            
        } catch (error) {
            console.error('[INVITE ERROR] Fout tijdens het tracken van join:', error.message);
        }
    }
};
