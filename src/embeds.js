const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

const COLOR = { BLUE:'#0099CC', NAVY:'#0D1B3E', ORANGE:'#FF6B35', GREEN:'#22C55E', RED:'#EF4444', GRAY:'#6B7280' };

function dur(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`;
}

function pirepEmbed(pirep, accepted) {
  const color = accepted ? COLOR.GREEN : COLOR.RED;
  const emoji = accepted ? '✅' : '❌';
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} PIREP ${accepted ? 'ACCEPTÉ' : 'REJETÉ'}`)
    .addFields(
      { name: '👨‍✈️ Pilote',      value: pirep.pilot_name ?? pirep.pilot?.name ?? '—', inline: true },
      { name: '🆔 ID',           value: String(pirep.pilot_id ?? '—'), inline: true },
      { name: '✈ Vol',           value: `FBU${pirep.flight_number ?? '—'}`, inline: true },
      { name: '🛫 Départ',       value: pirep.dpt_airport ?? pirep.dpt_airport_id ?? '—', inline: true },
      { name: '🛬 Arrivée',      value: pirep.arr_airport ?? pirep.arr_airport_id ?? '—', inline: true },
      { name: '⏱ Durée',        value: dur(pirep.flight_time), inline: true },
      { name: '📊 Score',        value: pirep.score ? `${pirep.score}%` : '—', inline: true },
      { name: '📉 Landing',      value: pirep.landing_rate ? `${pirep.landing_rate} ft/min` : '—', inline: true },
      { name: '🛩 Appareil',     value: pirep.aircraft_registration ?? pirep.aircraft ?? '—', inline: true },
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
    .setTimestamp();
}

function pilotEmbed(p) {
  return new EmbedBuilder()
    .setColor(COLOR.BLUE)
    .setTitle(`👨‍✈️ ${p.name}`)
    .addFields(
      { name: '🆔 ID Pilote',    value: p.pilot_id ?? '—', inline: true },
      { name: '🎖 Rang',         value: p.rank?.name ?? '—', inline: true },
      { name: '📍 Position',     value: p.curr_airport_id ?? '—', inline: true },
      { name: '✈ Vols totaux',   value: String(p.flights ?? 0), inline: true },
      { name: '⏱ Heures',       value: `${Math.floor((p.flight_time ?? 0)/60)}h`, inline: true },
      { name: '📊 Score moyen',  value: p.score ? `${p.score}%` : '—', inline: true },
      { name: '🏠 Hub',          value: p.home_airport_id ?? 'LFPO', inline: true },
      { name: '📅 Inscrit le',   value: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—', inline: true },
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
    .setTimestamp();
}

function statsEmbed(s) {
  return new EmbedBuilder()
    .setColor(COLOR.ORANGE)
    .setTitle('📊 French Bee Virtual — Statistiques')
    .addFields(
      { name: '👨‍✈️ Pilotes actifs',  value: String(s?.pilots ?? s?.pilot_count ?? '—'), inline: true },
      { name: '✈ PIREPs totaux',     value: String(s?.flights ?? s?.pirep_count ?? '—'), inline: true },
      { name: '⏱ Heures volées',    value: s?.flight_time ? `${Math.floor(s.flight_time/60)}h` : '—', inline: true },
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' })
    .setTimestamp();
}

function welcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(COLOR.BLUE)
    .setTitle('🐝 Bienvenue dans l\'équipage !')
    .setDescription(`Bienvenue ${member} sur **French Bee Virtual** !\n\nPour accéder à toutes les fonctionnalités, inscris-toi sur notre crew center et lie ton compte Discord.`)
    .addFields(
      { name: '📋 S\'inscrire',      value: `[newhorisons.com/register](${cfg.CREW_CENTER}/register)`, inline: true },
      { name: '✈ Vols',             value: `[Réserver un vol](${cfg.CREW_CENTER}/flights)`, inline: true },
      { name: '🎓 Training',         value: `[Type ratings](${cfg.CREW_CENTER}/lbatraining)`, inline: true },
      { name: '📖 Règlement',        value: `[Lire le règlement](${cfg.CREW_CENTER}/rules.html)`, inline: true },
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' })
    .setTimestamp();
}

function fbuEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR.BLUE)
    .setTitle('🐝 French Bee Virtual')
    .setDescription('La compagnie virtuelle qui recrée l\'expérience French Bee sur MSFS 2020 & 2024.\nA350 exclusivement depuis Paris-Orly.')
    .addFields(
      { name: '✈ ICAO',         value: 'FBU', inline: true },
      { name: '🛫 Hub',         value: 'Paris-Orly (LFPO)', inline: true },
      { name: '🛩 Flotte',      value: 'A350-900 / ULR / A350-1000', inline: true },
      { name: '🌍 Destinations', value: 'La Réunion · Martinique · Guadeloupe\nSan Francisco · Singapour · Tahiti · Honolulu' },
      { name: '🔗 Crew Center', value: cfg.CREW_CENTER, inline: true },
      { name: '💬 Discord',     value: cfg.DISCORD_LINK, inline: true },
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU · Non affiliée à French Bee' })
    .setTimestamp();
}

function metarEmbed(icao, raw) {
  let desc = `\`\`\`${raw}\`\`\``;
  const parts = raw.split(' ');
  const wind = parts.find(p => /^\d{3}\d{2}(G\d{2})?KT$/.test(p));
  const vis  = parts.find(p => /^\d{4}$/.test(p));
  const clouds = parts.filter(p => /^(FEW|SCT|BKN|OVC)\d{3}/.test(p));
  const temp = parts.find(p => /^\d{2}\/\d{2}$/.test(p) || /^M?\d{2}\/M?\d{2}$/.test(p));

  return new EmbedBuilder()
    .setColor(COLOR.NAVY)
    .setTitle(`🌤 METAR — ${icao}`)
    .setDescription(desc)
    .addFields(
      { name: '💨 Vent',        value: wind ?? '—', inline: true },
      { name: '👁 Visibilité', value: vis ? `${parseInt(vis)}m` : '—', inline: true },
      { name: '🌡 Temp/Point de rosée', value: temp ?? '—', inline: true },
      { name: '☁ Nuages',      value: clouds.length ? clouds.join(' · ') : 'CAVOK', inline: true },
    )
    .setFooter({ text: 'Source: VATSIM METAR · Actualisé à la demande' })
    .setTimestamp();
}

function vatsimEmbed(flights) {
  const embed = new EmbedBuilder()
    .setColor(COLOR.BLUE)
    .setTitle('🌐 Pilotes FBU en ligne — VATSIM')
    .setFooter({ text: 'Source: VATSIM Data v3' })
    .setTimestamp();

  if (!flights.length) {
    embed.setDescription('Aucun pilote FBU connecté sur VATSIM en ce moment.');
  } else {
    embed.setDescription(`**${flights.length}** pilote(s) FBU en ligne`);
    flights.slice(0, 10).forEach(f => {
      const dep = f.flight_plan?.departure ?? '—';
      const arr = f.flight_plan?.arrival ?? '—';
      const alt = f.flight_plan?.altitude ?? '—';
      embed.addFields({ name: `✈ ${f.callsign}`, value: `${dep} → ${arr} · FL${String(alt).replace('FL','')} · ${f.name}`, inline: true });
    });
  }
  return embed;
}

function promotionEmbed(name, pilotId, newRank, roleName) {
  return new EmbedBuilder()
    .setColor(COLOR.ORANGE)
    .setTitle('🎖 Promotion !')
    .setDescription(`Félicitez **${name}** (${pilotId}) qui vient d'être promu **${newRank}** ! 🐝${roleName ? `\n\nRôle Discord attribué : **${roleName}**` : ''}`)
    .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
    .setTimestamp();
}

function dmPromotionEmbed(name, newRank, roleName) {
  return new EmbedBuilder()
    .setColor(COLOR.ORANGE)
    .setTitle('🎖 Félicitations, promotion !')
    .setDescription(`Bonjour **${name}** !\n\nTu viens d'être promu **${newRank}** chez French Bee Virtual ! 🐝`)
    .addFields(
      { name: '🎯 Nouveau rang',  value: newRank, inline: true },
      { name: '🏷 Rôle Discord', value: roleName ?? '—', inline: true },
      { name: '🔗 Crew Center',  value: cfg.CREW_CENTER },
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
    .setTimestamp();
}

module.exports = { pirepEmbed, pilotEmbed, statsEmbed, welcomeEmbed, fbuEmbed, metarEmbed, vatsimEmbed, promotionEmbed, dmPromotionEmbed, COLOR, dur };
