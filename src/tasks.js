const cron   = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const api    = require('./api');
const embeds = require('./embeds');
const cfg    = require('./config');

function startTasks(client) {

  // Toutes les heures — METAR LFPO dans #metar
  cron.schedule('0 * * * *', async () => {
    try {
      const ch = client.channels.cache.get(cfg.CHANNELS.METAR);
      if (!ch) return;
      const raw = await api.getMetar('LFPO');
      if (!raw) return;
      await ch.send({ embeds: [embeds.metarEmbed('LFPO', raw)] });
    } catch (err) { console.error('Task METAR:', err.message); }
  });

  // Toutes les 30 min — vérifier pilotes VATSIM
  cron.schedule('*/30 * * * *', async () => {
    try {
      const ch = client.channels.cache.get(cfg.CHANNELS.ANNOUNCEMENTS);
      if (!ch) return;
      const flights = await api.getVatsimFlights();
      if (!flights.length) return;
      // Ne poster que si 3+ pilotes en ligne (éviter spam)
      if (flights.length >= 3) {
        const embed = new EmbedBuilder().setColor('#0099CC')
          .setTitle(`🌐 ${flights.length} pilotes FBU en vol sur VATSIM !`)
          .setDescription(flights.slice(0,5).map(f => `✈ **${f.callsign}** — ${f.flight_plan?.departure ?? '?'} → ${f.flight_plan?.arrival ?? '?'} · ${f.name}`).join('\n'))
          .setFooter({ text: 'French Bee Virtual · VATSIM Data' }).setTimestamp();
        await ch.send({ embeds: [embed] });
      }
    } catch (err) { console.error('Task VATSIM:', err.message); }
  });

  // Tous les lundis à 10h — récapitulatif hebdomadaire
  cron.schedule('0 10 * * 1', async () => {
    try {
      const ch = client.channels.cache.get(cfg.CHANNELS.ANNOUNCEMENTS);
      if (!ch) return;
      const pireps = await api.getPireps(10);
      const s      = await api.getStats();
      const embed  = new EmbedBuilder().setColor('#FF6B35')
        .setTitle('📊 Récapitulatif de la semaine — French Bee Virtual')
        .setDescription('Voici un résumé de l\'activité de la semaine passée ! 🐝')
        .addFields(
          { name: '👨‍✈️ Pilotes actifs', value: String(s?.pilots ?? '—'), inline: true },
          { name: '✈ PIREPs totaux',   value: String(s?.flights ?? '—'), inline: true },
          { name: '⏱ Heures volées',  value: s?.flight_time ? `${Math.floor(s.flight_time/60)}h` : '—', inline: true },
        );
      if (pireps.length) {
        embed.addFields({ name: '🏆 Vols récents', value: pireps.slice(0,5).map(p => `FBU${p.flight_number} · ${p.dpt_airport_id}→${p.arr_airport_id} · ${p.pilot?.name ?? '—'}`).join('\n') });
      }
      embed.setFooter({ text: 'French Bee Virtual · Rapport hebdomadaire' }).setTimestamp();
      await ch.send({ content: '@everyone', embeds: [embed] });
    } catch (err) { console.error('Task recap:', err.message); }
  });

  // Anti-sleep Render — toutes les 10 min
  const https = require('https');
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || `https://fbu-bot.onrender.com`;
    https.get(url, () => {}).on('error', () => {});
  }, 10 * 60 * 1000);

  console.log('✅ Tâches planifiées démarrées');
}

module.exports = { startTasks };
