import { Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. Alleen in #woordslang en negeer bots
        if (message.author.bot || !message.guild || message.channel.name !== 'woordslang') return;

        // --- ADMIN COMMANDO: RESET ---
        if (message.content === '/reset-woordslang') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            try {
                await pool.query('DELETE FROM woordenslang WHERE id = 1');
                return message.reply('🔄 **Woordslang gereset!** De eerstvolgende die een woord typt, begint de nieuwe slang.');
            } catch (e) { console.error(e); }
        }

        const woord = message.content.trim().toLowerCase();
        
        // Alleen echte woorden (geen cijfers/symbolen)
        if (!/^[a-zA-Záéíóúýnl]+$/.test(woord)) return;

        try {
            await pool.query('CREATE TABLE IF NOT EXISTS woordenslang (id INTEGER PRIMARY KEY, last_word TEXT, last_user TEXT)');
            
            let res = await pool.query('SELECT last_word, last_user FROM woordenslang WHERE id = 1');
            
            // Als de slang leeg is (na reset of start), mag alles
            if (res.rows.length === 0) {
                await pool.query('INSERT INTO woordenslang (id, last_word, last_user) VALUES (1, $1, $2)', [woord, message.author.id]);
                return message.react('✅');
            }

            const lastWord = res.rows[0].last_word;
            const lastUser = res.rows[0].last_user;
            const lastLetter = lastWord.slice(-1);

            // 2. De Logica Check
            if (woord.startsWith(lastLetter)) {
                
                // Mag niet twee keer achter elkaar
                if (message.author.id === lastUser) {
                    await message.react('❌');
                    return message.reply('Je mag niet twee keer achter elkaar! Laat iemand anders eerst een woord doen.');
                }

                // Alles oké! Update database
                await pool.query('UPDATE woordenslang SET last_word = $1, last_user = $2 WHERE id = 1', [woord, message.author.id]);
                await message.react('✅');

            } else {
                // Verkeerde letter -> We laten het bericht staan!
                await message.react('⚠️');
                return message.reply(`Helaas! **${lastWord}** eindigt op de **${lastLetter.toUpperCase()}**. Probeer het opnieuw met een woord dat begint met een **${lastLetter.toUpperCase()}**.`);
            }

        } catch (e) {
            console.error('Woordslang Error:', e);
        }
    }
};
