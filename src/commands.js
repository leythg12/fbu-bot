const { REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const api     = require('./api');
const embeds  = require('./embeds');
const cfg     = require('./config');
const { postRecruitmentPanel } = require('./recruitment');

const defs = [
  new SlashCommandBuilder().setName('pirep').setDescription('Derniers PIREPs acceptés')
    .addIntegerOption(o => o.setName('nombre').setDescription('Nombre (1-10)').setMinValue(1).setMaxValue(10)),

  new SlashCommandBuilder().setName('roster').setDescription('Roster des pilotes actifs')
    .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)),

  new SlashCommandBuilder().setName('pilote').setDescription('Infos sur un pilote')
    .addIntegerOption(o => o.setName('id').setDescription('ID numérique (ex: 1)').setRequired(true)),

  new SlashCommandBuilder().setName('flights').setDescription('Vols disponibles')
    .addStringOption(o => o.setName('destination').setDescription('Code ICAO (ex: FMEE)'))
    .addStringOption(o => o.setName('depart').setDescription('Code ICAO départ (défaut: LFPO)')),

  new SlashCommandBuilder().setName('stats').setDescription('Statistiques de French Bee Virtual'),

  new SlashCommandBuilder().setName('metar').setDescription('METAR d\'un aéroport')
    .addStringOption(o => o.setName('icao').setDescription('Code ICAO (ex: LFPO)').setRequired(true)),

  new SlashCommandBuilder().setName('vatsim').setDescription('Pilotes FBU connectés sur VATSIM en ce moment'),

  new SlashCommandBuilder().setName('fbu').setDescription('Informations sur French Bee Virtual'),

  new SlashCommandBuilder().setName('ma-position').setDescription('Voir ma position actuelle (depuis le crew center)')
    .addIntegerOption(o => o.setName('id').setDescription('Ton ID pilote numérique').setRequired(true)),

  new SlashCommandBuilder().setName('panel').setDescription('Poster le panel de recrutement [Admin]'),

  new SlashCommandBuilder().setName('annonce').setDescription('Poster une annonce dans #annonces [Admin]')
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'annonce').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Contenu de l\'annonce').setRequired(true))
    .addBooleanOption(o => o.setName('everyone').setDescription('Mentionner @everyone ?')),

  new SlashCommandBuilder().setName('aide').setDescription('Liste des commandes disponibles'),
].map(c => c.toJSON());

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(cfg.CLIENT_ID, cfg.GUILD_ID), { body: defs });
    console.log('✅ Slash commands déployées');
  } catch (err) { console.error('Deploy commands error:', err.message); }
}

async function handle(interaction, client) {
  await interaction.deferReply();
  try {
    switch (interaction.commandName) {

      case 'pirep': {
        const n = interaction.options.getInteger('nombre') ?? 5;
        const pireps = await api.getPireps(n);
        if (!pireps.length) { await interaction.editReply('Aucun PIREP récent.'); return; }
        const embed = new EmbedBuilder().setColor('#0099CC').setTitle(`✈ ${n} Derniers PIREPs — FBU`).setTimestamp().setFooter({ text: 'French Bee Virtual · ICAO FBU' });
        pireps.forEach(p => {
          embed.addFields({ name: `FBU${p.flight_number} · ${p.dpt_airport_id} → ${p.arr_airport_id}`, value: `👨‍✈️ ${p.pilot?.name ?? '—'} · ⏱ ${embeds.dur(p.flight_time)} · 📊 ${p.score ?? '—'}% · 📉 ${p.landing_rate ?? '—'} ft/min` });
        });
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'roster': {
        const page = (interaction.options.getInteger('page') ?? 1) - 1;
        const pilots = await api.getPilots(50);
        const chunk  = pilots.slice(page * 10, page * 10 + 10);
        if (!chunk.length) { await interaction.editReply('Aucun pilote trouvé sur cette page.'); return; }
        const embed = new EmbedBuilder().setColor('#0D1B3E')
          .setTitle(`👨‍✈️ Roster FBU — Page ${page+1}`)
          .setDescription(`${pilots.length} pilotes actifs`)
          .setTimestamp().setFooter({ text: 'French Bee Virtual · ICAO FBU' });
        chunk.forEach(p => embed.addFields({ name: `${p.pilot_id} · ${p.name}`, value: `${p.rank?.name ?? '—'} · ✈ ${p.flights ?? 0} vols · ⏱ ${Math.floor((p.flight_time ?? 0)/60)}h · 📍 ${p.curr_airport_id ?? '—'}`, inline: true }));
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'pilote': {
        const id = interaction.options.getInteger('id');
        const pilot = await api.getPilot(id);
        if (!pilot?.name) { await interaction.editReply(`Pilote ID \`${id}\` introuvable.`); return; }
        await interaction.editReply({ embeds: [embeds.pilotEmbed(pilot)] });
        break;
      }

      case 'ma-position': {
        const id = interaction.options.getInteger('id');
        const pilot = await api.getPilot(id);
        if (!pilot?.name) { await interaction.editReply(`Pilote ID \`${id}\` introuvable.`); return; }
        const embed = new EmbedBuilder().setColor('#0099CC')
          .setTitle(`📍 Position de ${pilot.name}`)
          .addFields(
            { name: '📍 Position actuelle', value: pilot.curr_airport_id ?? '—', inline: true },
            { name: '🏠 Hub',               value: pilot.home_airport_id ?? 'LFPO', inline: true },
            { name: '🎖 Rang',              value: pilot.rank?.name ?? '—', inline: true },
          )
          .setFooter({ text: 'French Bee Virtual · newhorisons.com' }).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'flights': {
        const dest = interaction.options.getString('destination');
        const dep  = interaction.options.getString('depart') ?? 'LFPO';
        const q    = dest ? `arr_airport=${dest.toUpperCase()}` : `dpt_airport=${dep.toUpperCase()}`;
        const flights = await api.getFlights(q);
        const embed = new EmbedBuilder().setColor('#0099CC')
          .setTitle(dest ? `🗺 Vols → ${dest.toUpperCase()}` : `🗺 Vols depuis ${dep.toUpperCase()}`)
          .setFooter({ text: 'newhorisons.com/flights' }).setTimestamp();
        if (!flights.length) { embed.setDescription('Aucun vol trouvé.'); }
        else { flights.forEach(f => { embed.addFields({ name: `FBU${f.flight_number} · ${f.dpt_airport_id} → ${f.arr_airport_id}`, value: `⏱ ${embeds.dur(f.flight_time)} · 📏 ${f.distance ?? '—'} nm`, inline: true }); }); }
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'stats': {
        const s = await api.getStats();
        if (!s) { await interaction.editReply('Stats non disponibles (service key manquante).'); return; }
        await interaction.editReply({ embeds: [embeds.statsEmbed(s)] });
        break;
      }

      case 'metar': {
        const icao = interaction.options.getString('icao').toUpperCase();
        const raw  = await api.getMetar(icao);
        if (!raw) { await interaction.editReply(`METAR pour ${icao} non disponible.`); return; }
        await interaction.editReply({ embeds: [embeds.metarEmbed(icao, raw)] });
        break;
      }

      case 'vatsim': {
        const flights = await api.getVatsimFlights();
        await interaction.editReply({ embeds: [embeds.vatsimEmbed(flights)] });
        break;
      }

      case 'fbu': {
        await interaction.editReply({ embeds: [embeds.fbuEmbed()] });
        break;
      }

      case 'panel': {
        if (!interaction.member.permissions.has('Administrator')) { await interaction.editReply('❌ Admins seulement.'); return; }
        await postRecruitmentPanel(interaction.channel);
        await interaction.editReply('✅ Panel posté !');
        break;
      }

      case 'annonce': {
        if (!interaction.member.permissions.has('Administrator')) { await interaction.editReply('❌ Admins seulement.'); return; }
        const titre   = interaction.options.getString('titre');
        const message = interaction.options.getString('message');
        const everyone = interaction.options.getBoolean('everyone') ?? false;
        const ch = client.channels.cache.get(cfg.CHANNELS.ANNOUNCEMENTS);
        if (!ch) { await interaction.editReply('Canal #annonces introuvable.'); return; }
        const embed = new EmbedBuilder().setColor('#0099CC').setTitle(`📢 ${titre}`)
          .setDescription(message).setAuthor({ name: interaction.user.username })
          .setFooter({ text: 'French Bee Virtual · ICAO FBU' }).setTimestamp();
        await ch.send({ content: everyone ? '@everyone' : undefined, embeds: [embed] });
        await interaction.editReply('✅ Annonce postée !');
        break;
      }

      case 'aide': {
        const embed = new EmbedBuilder().setColor('#0099CC').setTitle('🐝 Commandes French Bee Virtual')
          .addFields(
            { name: '✈ Opérations', value: '`/pirep` `/flights` `/stats` `/vatsim`', inline: false },
            { name: '👨‍✈️ Pilotes',  value: '`/pilote` `/roster` `/ma-position`', inline: false },
            { name: '🌤 Météo',     value: '`/metar`', inline: false },
            { name: 'ℹ Infos',     value: '`/fbu` `/aide`', inline: false },
            { name: '🔐 Admin',    value: '`/panel` `/annonce`', inline: false },
          )
          .setFooter({ text: `French Bee Virtual · ${cfg.CREW_CENTER}` }).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      default:
        await interaction.editReply('Commande inconnue.');
    }
  } catch (err) {
    console.error(`Erreur /${interaction.commandName}:`, err.message);
    await interaction.editReply('❌ Erreur. Réessaie dans quelques instants.').catch(() => {});
  }
}

module.exports = { deployCommands, handle };
