require('dotenv').config();
const {
  Client, GatewayIntentBits, Events,
  EmbedBuilder, ActivityType
} = require('discord.js');
const express = require('express');
const { loadCommands, handleCommand } = require('./commands');
const { assignRankRole } = require('./ranks');
const {
  createTicket, showPilotForm, showStaffForm,
  postFormResult, notifyPlayer, acceptCandidate,
  rejectCandidate, closeTicket
} = require('./recruitment');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ FBU Bot connecté : ${client.user.tag}`);
  client.user.setActivity('les vols FBU ✈', { type: ActivityType.Watching });
  await loadCommands(client);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const channel = member.guild.channels.cache.get(process.env.CHANNEL_WELCOME);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor('#0099CC')
      .setTitle('🐝 Bienvenue dans l\'équipage !')
      .setDescription(`Bienvenue ${member} sur le serveur **French Bee Virtual** !\n\nInscris-toi sur notre crew center pour accéder à toutes les fonctionnalités.`)
      .addFields(
        { name: '📋 Inscription', value: '[newhorisons.com/register](https://newhorisons.com/register)', inline: true },
        { name: '✈ Vols', value: '[newhorisons.com/flights](https://newhorisons.com/flights)', inline: true },
        { name: '🎓 Training', value: '[newhorisons.com/lbatraining](https://newhorisons.com/lbatraining)', inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) { console.error('Welcome error:', err.message); }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === 'ticket_pilot')           { await createTicket(interaction, 'pilot'); return; }
    if (id === 'ticket_staff')           { await createTicket(interaction, 'staff'); return; }
    if (id.startsWith('form_pilot_'))    { await showPilotForm(interaction); return; }
    if (id.startsWith('form_staff_'))    { await showStaffForm(interaction); return; }
    if (id.startsWith('notify_'))        { await notifyPlayer(interaction, id.replace('notify_','')); return; }
    if (id.startsWith('accept_'))        { await acceptCandidate(interaction, id.replace('accept_','')); return; }
    if (id.startsWith('reject_'))        { await rejectCandidate(interaction, id.replace('reject_','')); return; }
    if (id.startsWith('close_'))         { await closeTicket(interaction, id.replace('close_','')); return; }
    if (id.startsWith('transcript_'))    { await interaction.reply({ content: '📄 Transcript à venir.', ephemeral: true }); return; }
  }

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (id.startsWith('modal_pilot_')) {
      await postFormResult(interaction, 'pilot', {
        name:       interaction.fields.getTextInputValue('name'),
        age:        interaction.fields.getTextInputValue('age'),
        simulator:  interaction.fields.getTextInputValue('simulator'),
        network:    interaction.fields.getTextInputValue('network'),
        motivation: interaction.fields.getTextInputValue('motivation'),
      });
      return;
    }
    if (id.startsWith('modal_staff_')) {
      await postFormResult(interaction, 'staff', {
        name:       interaction.fields.getTextInputValue('name'),
        age:        interaction.fields.getTextInputValue('age'),
        poste:      interaction.fields.getTextInputValue('poste'),
        experience: interaction.fields.getTextInputValue('experience'),
        motivation: interaction.fields.getTextInputValue('motivation'),
      });
      return;
    }
  }
});

const app = express();
app.use(express.json());

app.post('/webhook/pirep', async (req, res) => {
  res.sendStatus(200);
  try {
    const { event, pirep } = req.body;
    if (!pirep) return;
    const channel  = client.channels.cache.get(process.env.CHANNEL_PIREPS);
    if (!channel) return;
    const accepted = ['pirep.accepted','PirepAccepted'].includes(event);
    const embed = new EmbedBuilder()
      .setColor(accepted ? '#22C55E' : '#EF4444')
      .setTitle(`${accepted ? '✅' : '❌'} PIREP ${accepted ? 'ACCEPTÉ' : 'REJETÉ'}`)
      .addFields(
        { name: '👨‍✈️ Pilote',      value: pirep.pilot_name ?? '—', inline: true },
        { name: '🆔 ID',           value: pirep.pilot_id ?? '—', inline: true },
        { name: '✈ Vol',           value: `FBU${pirep.flight_number ?? '—'}`, inline: true },
        { name: '🛫 Départ',       value: pirep.dpt_airport ?? '—', inline: true },
        { name: '🛬 Arrivée',      value: pirep.arr_airport ?? '—', inline: true },
        { name: '⏱ Durée',        value: pirep.flight_time ? `${Math.floor(pirep.flight_time/60)}h${String(pirep.flight_time%60).padStart(2,'0')}` : '—', inline: true },
        { name: '📊 Score',        value: pirep.score ? `${pirep.score}%` : '—', inline: true },
        { name: '📉 Atterrissage', value: pirep.landing_rate ? `${pirep.landing_rate} ft/min` : '—', inline: true },
      )
      .setFooter({ text: 'French Bee Virtual · FBU' })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) { console.error('Webhook pirep:', err.message); }
});

app.post('/webhook/discord-linked', async (req, res) => {
  res.sendStatus(200);
  try {
    const { discord_id, pilot_id, name } = req.body;
    if (!discord_id) return;
    const guild  = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(discord_id).catch(() => null);
    if (!member) return;
    const firstName = name?.split(' ')[0] ?? 'Pilote';
    await member.setNickname(`${firstName} - ${pilot_id}`).catch(() => {});
    const role = guild.roles.cache.get(process.env.ROLE_PILOT);
    if (role) await member.roles.add(role).catch(() => {});
    const embed = new EmbedBuilder()
      .setColor('#0099CC')
      .setTitle('🐝 Compte lié avec succès !')
      .setDescription(`Ton compte French Bee Virtual est lié à Discord.\n\n**${pilot_id}** · ${name}`)
      .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
      .setTimestamp();
    await member.send({ embeds: [embed] }).catch(() => {});
  } catch (err) { console.error('Webhook linked:', err.message); }
});

app.post('/webhook/rank-changed', async (req, res) => {
  res.sendStatus(200);
  try {
    const { discord_id, pilot_id, name, new_rank } = req.body;
    if (!discord_id) return;
    const guild  = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    const member = await guild?.members.fetch(discord_id).catch(() => null);
    if (!member) return;
    const roleName = await assignRankRole(member, new_rank);
    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('🎖 Promotion !')
      .setDescription(`Félicitations **${name}** ! Tu viens d'être promu **${new_rank}** ! 🐝${roleName ? `\n\nRôle Discord : **${roleName}**` : ''}`)
      .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
      .setTimestamp();
    await member.send({ embeds: [embed] }).catch(() => {});
    const ch = client.channels.cache.get(process.env.CHANNEL_ANNOUNCEMENTS);
    if (ch) await ch.send({ embeds: [
      new EmbedBuilder().setColor('#FF6B35').setTitle('🎖 Promotion')
        .setDescription(`Félicitez **${name}** (${pilot_id}) promu **${new_rank}** ! 🐝`).setTimestamp()
    ]});
  } catch (err) { console.error('Webhook rank:', err.message); }
});

app.post('/webhook/news', async (req, res) => {
  res.sendStatus(200);
  try {
    const { title, body, author } = req.body;
    const ch = client.channels.cache.get(process.env.CHANNEL_ANNOUNCEMENTS);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor('#0099CC').setTitle(`📢 ${title}`)
      .setDescription(body?.substring(0,2000) ?? '')
      .setAuthor({ name: author ?? 'French Bee Virtual' })
      .setFooter({ text: 'French Bee Virtual · ICAO FBU' }).setTimestamp();
    await ch.send({ content: '@everyone', embeds: [embed] });
  } catch (err) { console.error('Webhook news:', err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Webhook server port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
