import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

export default {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // 1. Commando om een partner toe te voegen (!addpartner @gebruiker)
        if (message.content.startsWith('!addpartner')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            
            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ Tag wel even de persoon die een partner heeft binnengehaald!');

            try {
                await pool.query('CREATE TABLE IF NOT EXISTS partners (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
                await pool.query('INSERT INTO partners (user_id, count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = partners.count + 1', [target.id]);
                
                return message.reply(`✅ Lekker bezig! **${target.username}** heeft er een partnerpunt bij.`);
            } catch (e) {
                console.error(e);
                return message.reply('❌ Database fout bij het toevoegen.');
            }
        }

        // 2. Het Leaderboard bekijken (!partners)
        if (message.content.toLowerCase() === '!partners') {
            try {
                const res = await pool.query('SELECT user_id, count FROM partners ORDER BY count DESC LIMIT 10');
                
                const embed = new EmbedBuilder()
                    .setTitle('🤝 NEXSPACE PARTNER LEADERBOARD')
                    .setColor('#FF00FF')
                    .setThumbnail(message.guild.iconURL())
                    .setFooter({ text: 'NexSpace Partners' })
                    .setTimestamp();

                if (res.rows.length === 0) {
                    embed.setDescription('Er zijn nog geen partners geregistreerd. Gebruik `!addpartner` om te beginnen!');
                } else {
                    const list = res.rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.count}** partners`).join('\n');
                    embed.setDescription(list);
                }

                return message.reply({ embeds: [embed] });
            } catch (e) {
                console.error(e);
                return message.reply('❌ Kon het partner leaderboard niet laden.');
            }
        }
    }
};
