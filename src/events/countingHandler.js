import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
db.connect();

const CONFIG = {
    CHANNEL_NAME: 'tellen',
    COLOR_SUCCESS: '#00FFFF', // Neon Cyaan
    COLOR_ERROR: '#FF0055'    // Fel Rood
};

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || message.channel.name !== CONFIG.CHANNEL_NAME) return;

        // Maak tabel als die niet bestaat
        await db.query(`CREATE TABLE IF NOT EXISTS counting (id SERIAL PRIMARY KEY, current_count INTEGER, last_user TEXT)`);
        
        // Haal huidige stand op
        let res = await db.query(`SELECT * FROM counting WHERE id = 1`);
        if (res.rows.length === 0) {
            await db.query(`INSERT INTO counting (id, current_count, last_user) VALUES (1, 0, 'none')`);
            res = await db.query(`SELECT * FROM counting WHERE id = 1`);
        }

        const currentCount = res.rows[0].current_count;
        const lastUser = res.rows[0].last_user;
        const userInput = parseInt(message.content);

        // Als het geen getal is, negeer het bericht
        if (isNaN(userInput)) return;

        // 1. Check of dezelfde persoon weer telt
        if (message.author.id === lastUser) {
            await message.react('❌');
            await resetCount(message, "Je mag niet twee keer achter elkaar tellen!");
            return;
        }

        // 2. Check of het getal klopt
        if (userInput !== currentCount + 1) {
            await message.react('⚠️');
            await resetCount(message, `${userInput} was niet het juiste getal. We waren bij ${currentCount}!`);
            return;
        }

        // 3. Succes! Update database
        await db.query(`UPDATE counting SET current_count = current_count + 1, last_user = $1 WHERE id = 1`, [message.author.id]);
        await message.react('✅');
    }
};

async function resetCount(message, reason) {
    await db.query(`UPDATE counting SET current_count = 0, last_user = 'none' WHERE id = 1`);
    
    const embed = new EmbedBuilder()
        .setTitle('🚫 Oei, foutje!')
        .setDescription(`${reason}\n\nWe beginnen weer bij **1**!`)
        .setColor(CONFIG.COLOR_ERROR)
        .setFooter({ text: 'NexSpace Counting Engine' });

    await message.reply({ embeds: [embed] });
}
