import { Collection } from 'discord.js';

// Hier slaan we alle invites in het geheugen op
const invitesCache = new Collection();

/**
 * Cache alle huidige invites van alle servers waar de bot in zit
 */
export async function initInviteTracker(client) {
    console.log('[INVITE] Invites cachen starten...');
    
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Haal alle actuele invites op van de server
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Collection(guildInvites.map(invite => [invite.code, invite.uses])));
            console.log(`[INVITE] ${guildInvites.size} invites gecached voor server: ${guild.name}`);
        } catch (error) {
            console.error(`[INVITE ERROR] Kon invites niet cachen voor ${guild.name}:`, error.message);
        }
    }
}

/**
 * Track wie er joint en welke invite is gebruikt
 */
export async function trackMemberJoin(member) {
    const { guild } = member;
    
    try {
        // Haal de nieuwe status van de invites op
        const newInvites = await guild.invites.fetch();
        // Haal de oude status uit ons geheugen
        const oldInvites = invitesCache.get(guild.id);
        
        // Zoek de invite waarvan de 'uses' (teller) omhoog is gegaan
        const usedInvite = newInvites.find(inv => oldInvites && oldInvites.get(inv.code) < inv.uses);
        
        // Update direct de cache voor de volgende keer
        invitesCache.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));
        
        if (usedInvite) {
            console.log(`[JOIN] ${member.user.tag} is gejoined met invite code ${usedInvite.code} van ${usedInvite.inviter?.tag || 'Onbekend'}`);
            return usedInvite; // Geeft de invite data terug (code, inviter, uses, etc.)
        }
        
    } catch (error) {
        console.error('[INVITE ERROR] Fout tijdens het tracken van join:', error);
    }
    
    return null;
}

/**
 * Zorg dat de cache up-to-date blijft als er een invite wordt aangemaakt/verwijderd
 */
export function updateInviteCache(guildId, guildInvites) {
    invitesCache.set(guildId, new Collection(guildInvites.map(invite => [invite.code, invite.uses])));
}
