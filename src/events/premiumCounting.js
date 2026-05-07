import { Events } from 'discord.js';
import pg from 'pg';

// De database verbinding met de extra beveiliging (SSL) voor Railway
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false
    }
});

export default {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. Alleen in het kanaal #tellen en negeer bots
        if (message.author.bot || !message.guild || message.channel.name !== 'tellen') return;

        // 2. Check of het bericht een getal is
        const input = parseInt(message.content);
        if (isNaN(input)) return; 

        try {
            // Zorg dat de tabel voor het tellen bestaat
            await pool.query('CREATE TABLE IF NOT EXISTS counting_game (id INTEGER PRIMARY KEY, count INTEGER, last_user TEXT)');
            
            let res = await pool.query('SELECT count, last_user FROM counting_game WHERE id = 1');
            
            if (res.rows.length === 0) {
                await pool.query('INSERT INTO counting_game (id, count, last_user) VALUES (1, 0, \'none\')');
                res = { rows: [{ count: 0, last_user: 'none' }] };
            }

            const currentCount = res.rows[0].count;
            const lastUser = res.rows[0].last_user;

            // 3. De Logica: Is het getal goed?
            if (input === currentCount + 1 && message.author.id !== lastUser) {
                // Getal is goed! Update de database
                await pool.query('UPDATE counting_game SET count = $1, last_user = $2 WHERE id = 1', [input, message.author.id]);
                await message.react('✅');

                // --- SPECIAL EVENTS ---
                if (input === 67) {
                    await message.channel.send(`${message.author} **SIX SEVEN!** 🚀`);
                }

                if (input === 1000) {
                    await message.channel.send(`🏆 **Je hebt het uitgespeeld lekker mannen!**\nDe teller is gereset naar 0.`);
                    await pool.query('UPDATE counting_game SET count = 0, last_user = \'none\' WHERE id = 1');
                }

            } else {
                // Fout gemaakt! Reset naar 0
                await pool.query('UPDATE counting_game SET count = 0, last_user = \'none\' WHERE id = 1');
                await message.react('❌');
                await message.reply(`❌ **FOUT!** We beginnen weer bij **1**!`);
            }
        } catch (e) {
            console.error('Counting Error:', e);
        }
    }
};
