const { EmbedBuilder } = require('discord.js');
const embeds = require('./embeds');
const cfg    = require('./config');
const { assignRankRole } = require('./ranks');

async function handlePirep(req, client) {
  try {
    const { event, pirep } = req.body;
    if (!pirep) return;
    const ch = client.channels.cache.get(cfg.CHANNELS.PIREPS);
    if (!ch) return;
    const accepted = ['pirep.accepted','PirepAccepted','pirep_accepted'].includes(event);
    await ch.send({ embeds: [embeds.pirepEmbed(pirep, accepted)] });
  } catch (err) { console.error('Webhook pirep:', err.message); }
}

async function handleDiscordLinked(req, client) {
  try {
    const { discord_id, pilot_id, name, rank } = req.body;
    if (!discord_id) return;
    const guild  = client.guilds.cache.get(cfg.GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(discord_id).catch(() => null);
    if (!member) return;

    const firstName = name?.split(' ')[0] ?? 'Pilote';
    await member.setNickname(`${firstName} - ${pilot_id}`).catch(() => {});

    if (rank) {
      await assignRankRole(member, rank);
    } else {
      const role = guild.roles.cache.get(cfg.ROLES.PILOT ?? cfg.ROLES.ELEVE);
      if (role) await member.roles.add(role).catch(() => {});
    }

    const embed = new EmbedBuilder().setColor('#0099CC').setTitle('🐝 Compte lié avec succès !')
      .setDescription(`Ton compte **French Bee Virtual** est maintenant lié à Discord.\n\n**${pilot_id}** · ${name}`)
      .addFields(
        { name: '✈ Réserver un vol', value: `${cfg.CREW_CENTER}/flights`, inline: true },
        { name: '🎓 Training Center', value: `${cfg.CREW_CENTER}/lbatraining`, inline: true },
      )
      .setFooter({ text: 'French Bee Virtual · ICAO FBU' }).setTimestamp();
    await member.send({ embeds: [embed] }).catch(() => {});

    const wch = client.channels.cache.get(cfg.CHANNELS.WELCOME);
    if (wch) {
      const wEmbed = new EmbedBuilder().setColor('#22C55E')
        .setTitle('✈ Nouveau pilote enregistré !')
        .setDescription(`**${name}** (${pilot_id}) a lié son compte Discord et rejoint l'équipage ! 🐝`)
        .setFooter({ text: 'French Bee Virtual · ICAO FBU' }).setTimestamp();
      await wch.send({ embeds: [wEmbed] });
    }
  } catch (err) { console.error('Webhook linked:', err.message); }
}

async function handleRankChanged(req, client) {
  try {
    const { discord_id, pilot_id, name, old_rank, new_rank } = req.body;
    if (!discord_id || !new_rank) return;
    const guild  = client.guilds.cache.get(cfg.GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(discord_id).catch(() => null);
    if (!member) return;

    const roleName = await assignRankRole(member, new_rank);
    await member.send({ embeds: [embeds.dmPromotionEmbed(name, new_rank, roleName)] }).catch(() => {});

    const ch = client.channels.cache.get(cfg.CHANNELS.ANNOUNCEMENTS);
    if (ch) await ch.send({ embeds: [embeds.promotionEmbed(name, pilot_id, new_rank, roleName)] });
  } catch (err) { console.error('Webhook rank:', err.message); }
}

async function handleNews(req, client) {
  try {
    const { title, body, author } = req.body;
    const ch = client.channels.cache.get(cfg.CHANNELS.ANNOUNCEMENTS);
    if (!ch) return;
    const embed = new EmbedBuilder().setColor('#0099CC').setTitle(`📢 ${title}`)
      .setDescription(body?.substring(0, 2000) ?? '')
      .setAuthor({ name: author ?? 'French Bee Virtual' })
      .setFooter({ text: 'French Bee Virtual · ICAO FBU' }).setTimestamp();
    await ch.send({ content: '@everyone', embeds: [embed] });
  } catch (err) { console.error('Webhook news:', err.message); }
}

async function handleUserRegistered(req, client) {
  try {
    const { name, pilot_id, email } = req.body;
    const ch = client.channels.cache.get(cfg.CHANNELS.LOGS);
    if (!ch) return;
    const embed = new EmbedBuilder().setColor('#0099CC').setTitle('🆕 Nouvelle inscription')
      .addFields(
        { name: '👤 Nom',     value: name ?? '—', inline: true },
        { name: '🆔 ID',      value: pilot_id ?? '—', inline: true },
      )
      .setFooter({ text: 'French Bee Virtual · Crew Center' }).setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch (err) { console.error('Webhook register:', err.message); }
}

module.exports = { handlePirep, handleDiscordLinked, handleRankChanged, handleNews, handleUserRegistered };
