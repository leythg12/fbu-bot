require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');
const express  = require('express');
const cfg      = require('./config');
const commands = require('./commands');
const wh       = require('./webhooks');
const { startTasks }  = require('./tasks');
const { assignRankRole } = require('./ranks');
const {
  createTicket, showPilotForm, showStaffForm,
  postFormResult, notifyPlayer, acceptCandidate,
  rejectCandidate, closeTicket
} = require('./recruitment');
const embeds = require('./embeds');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Ready ─────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ FBU Bot v3 connecté : ${client.user.tag}`);
  client.user.setActivity('les vols FBU ✈ | /aide', { type: ActivityType.Watching });
  await commands.deployCommands();
  startTasks(client);
});

// ── Nouveau membre ────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const ch = member.guild.channels.cache.get(cfg.CHANNELS.WELCOME);
    if (ch) await ch.send({ embeds: [embeds.welcomeEmbed(member)] });
  } catch (err) { console.error('Welcome:', err.message); }
});

// ── Interactions ──────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()) {
    await commands.handle(interaction, client);
    return;
  }

  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === 'ticket_pilot')         { await createTicket(interaction, 'pilot'); return; }
    if (id === 'ticket_staff')         { await createTicket(interaction, 'staff'); return; }
    if (id.startsWith('form_pilot_'))  { await showPilotForm(interaction); return; }
    if (id.startsWith('form_staff_'))  { await showStaffForm(interaction); return; }
    if (id.startsWith('notify_'))      { await notifyPlayer(interaction, id.replace('notify_', '')); return; }
    if (id.startsWith('accept_'))      { await acceptCandidate(interaction, id.replace('accept_', '')); return; }
    if (id.startsWith('reject_'))      { await rejectCandidate(interaction, id.replace('reject_', '')); return; }
    if (id.startsWith('close_'))       { await closeTicket(interaction, id.replace('close_', '')); return; }
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

// ── Webhook Express ───────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/',             (_, res) => res.json({ status: 'FBU Bot v3 online', bot: client.user?.tag ?? 'connecting' }));
app.post('/webhook/pirep',            (req, res) => { res.sendStatus(200); wh.handlePirep(req, client); });
app.post('/webhook/discord-linked',   (req, res) => { res.sendStatus(200); wh.handleDiscordLinked(req, client); });
app.post('/webhook/rank-changed',     (req, res) => { res.sendStatus(200); wh.handleRankChanged(req, client); });
app.post('/webhook/news',             (req, res) => { res.sendStatus(200); wh.handleNews(req, client); });
app.post('/webhook/user-registered',  (req, res) => { res.sendStatus(200); wh.handleUserRegistered(req, client); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Webhook server on port ${PORT}`));
// Anti-sleep Render
const https = require('https');
setInterval(() => {
  https.get('https://fbu-bot.onrender.com', () => {});
}, 10 * 60 * 1000);
client.login(process.env.DISCORD_TOKEN);
//active
