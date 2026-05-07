import { Events } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. Check op kanaalnaam #woordslang en negeer bots
        if (message.author.bot || !message.guild || message.channel.name !== 'woordslang') return;

        const woord = message.content.trim().toLowerCase();
        
        // Alleen echte woorden toestaan (geen spaties, geen cijfers)
        if (!/^[a-zA-Záéíóúýnl]+$/.test(woord)) return;

        try {
            await pool.query('CREATE TABLE IF NOT EXISTS woordenslang (id INTEGER PRIMARY KEY, last_word TEXT, last_user TEXT)');
            
            let res = await pool.query('SELECT last_word, last_user FROM woordenslang WHERE id = 1');
            
            if (res.rows.length === 0) {
                // Eerste woord van de game
                await pool.query('INSERT INTO woordenslang (id, last_word, last_user) VALUES (1, $1, $2)', [woord, message.author.id]);
                return message.react('✅');
            }

            const lastWord = res.rows[0].last_word;
            const lastUser = res.rows[0].last_user;
            const lastLetter = lastWord.slice(-1);

            // 2. De Logica
            if (woord.startsWith(lastLetter)) {
                
                // Mag niet twee keer achter elkaar
                if (message.author.id === lastUser) {
                    await message.react('❌');
                    const msg = await message.reply('Rustig aan! Wacht tot iemand anders een woord typt.');
                    setTimeout(() => msg.delete(), 5000); // Verwijder de waarschuwing na 5 sec
                    return;
                }

                // Update database
                await pool.query('UPDATE woordenslang SET last_word = $1, last_user = $2 WHERE id = 1', [woord, message.author.id]);
                await message.react('✅');

            } else {
                // Verkeerde beginletter
                await message.react('⚠️');
                const info = await message.reply(`Helaas! **${lastWord}** eindigt op de **${lastLetter.toUpperCase()}**. Jouw woord begint met een **${woord[0].toUpperCase()}**.`);
                setTimeout(() => info.delete(), 5000);
            }

        } catch (e) {
            console.error('Woordslang Error:', e);
        }
    }
};
