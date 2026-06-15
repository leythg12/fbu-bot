const { REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const PHPVMS = process.env.PHPVMS_URL;
const API_KEY = process.env.PHPVMS_API_KEY;

const api = axios.create({
  baseURL: `${PHPVMS}/api`,
  headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
  timeout: 8000,
});

const dbapi = axios.create({
  baseURL: `${PHPVMS}/dbapi`,
  headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
  timeout: 8000,
});

const commands = [
  new SlashCommandBuilder()
    .setName('pirep')
    .setDescription('Voir les derniers PIREPs French Bee Virtual')
    .addIntegerOption(o => o.setName('count').setDescription('Nombre de PIREPs (1-10)').setMinValue(1).setMaxValue(10)),
  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Voir le roster des pilotes FBU'),
  new SlashCommandBuilder()
    .setName('flights')
    .setDescription('Voir les vols disponibles depuis LFPO')
    .addStringOption(o => o.setName('destination').setDescription('Code ICAO destination (ex: FMEE)')),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiques de French Bee Virtual'),
  new SlashCommandBuilder()
    .setName('pilote')
    .setDescription('Informations sur un pilote FBU')
    .addStringOption(o => o.setName('id').setDescription('ID pilote (ex: FBU0001)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('metar')
    .setDescription('METAR d\'un aéroport')
    .addStringOption(o => o.setName('icao').setDescription('Code ICAO (ex: LFPO)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('fbu')
    .setDescription('Informations sur French Bee Virtual'),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Poster le panel de recrutement (Admin)'),
].map(c => c.toJSON());

async function loadCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands déployées');
  } catch (err) {
    console.error('Erreur deploy commands:', err.message);
  }
}

async function handleCommand(interaction) {
  await interaction.deferReply();
  try {
    switch (interaction.commandName) {

      case 'pirep': {
        const count = interaction.options.getInteger('count') ?? 5;
        const { data } = await api.get(`/pireps?limit=${count}&state=2`);
        const pireps = data?.data ?? [];
        if (!pireps.length) { await interaction.editReply('Aucun PIREP trouvé.'); return; }
        const embed = new EmbedBuilder()
          .setColor('#0099CC')
          .setTitle('✈ Derniers PIREPs — French Bee Virtual')
          .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
          .setTimestamp();
        pireps.forEach(p => {
          const dur = p.flight_time ? `${Math.floor(p.flight_time/60)}h${String(p.flight_time%60).padStart(2,'0')}` : '—';
          embed.addFields({
            name: `FBU${p.flight_number} · ${p.dpt_airport_id} → ${p.arr_airport_id}`,
            value: `👨‍✈️ ${p.pilot?.name ?? '—'} · ⏱ ${dur} · 📊 ${p.score ?? '—'}% · 📉 ${p.landing_rate ?? '—'} ft/min`
          });
        });
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'roster': {
        const { data } = await dbapi.get('/roster');
        const pilots = data?.data ?? data ?? [];
        const embed = new EmbedBuilder()
          .setColor('#0D1B3E')
          .setTitle('👨‍✈️ Roster — French Bee Virtual')
          .setDescription(`**${Array.isArray(pilots) ? pilots.length : '?'}** pilotes`)
          .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
          .setTimestamp();
        (Array.isArray(pilots) ? pilots : []).slice(0, 10).forEach(p => {
          embed.addFields({
            name: `${p.pilot_id ?? '—'} · ${p.name ?? '—'}`,
            value: `${p.rank?.name ?? p.rank ?? '—'} · ✈ ${p.flights ?? 0} vols · ⏱ ${Math.floor((p.flight_time ?? 0)/60)}h`,
            inline: true
          });
        });
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'flights': {
        const dest = interaction.options.getString('destination');
        const url  = dest ? `/flights?arr_airport=${dest}&limit=8` : '/flights?dpt_airport=LFPO&limit=8';
        const { data } = await api.get(url);
        const flights = data?.data ?? [];
        const embed = new EmbedBuilder()
          .setColor('#0099CC')
          .setTitle(`🗺 Vols${dest ? ` → ${dest.toUpperCase()}` : ' depuis LFPO'}`)
          .setFooter({ text: 'newhorisons.com/flights' })
          .setTimestamp();
        if (!flights.length) { embed.setDescription('Aucun vol trouvé.'); }
        else {
          flights.slice(0,8).forEach(f => {
            const dur = f.flight_time ? `${Math.floor(f.flight_time/60)}h${String(f.flight_time%60).padStart(2,'0')}` : '—';
            embed.addFields({ name: `FBU${f.flight_number} · ${f.dpt_airport_id} → ${f.arr_airport_id}`, value: `⏱ ${dur} · 📏 ${f.distance ?? '—'} nm`, inline: true });
          });
        }
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'stats': {
        const { data } = await dbapi.get('/stats');
        const s = data?.data ?? data ?? {};
        const embed = new EmbedBuilder()
          .setColor('#FF6B35')
          .setTitle('📊 Statistiques — French Bee Virtual')
          .addFields(
            { name: '👨‍✈️ Pilotes', value: String(s.pilots ?? s.pilot_count ?? '—'), inline: true },
            { name: '✈ PIREPs', value: String(s.flights ?? s.pirep_count ?? '—'), inline: true },
            { name: '⏱ Heures volées', value: s.flight_time ? `${Math.floor(s.flight_time/60)}h` : (s.flight_hours ? `${Math.floor(s.flight_hours)}h` : '—'), inline: true },
          )
          .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'pilote': {
        const input = interaction.options.getString('id');
        // Chercher par pilot_id ou par ID numérique
        const numId = input.replace(/[^0-9]/g, '');
        const { data } = await api.get(`/users/${numId || input}`);
        const pilot = data?.data ?? data;
        if (!pilot || !pilot.name) { await interaction.editReply(`Pilote \`${input}\` introuvable.`); return; }
        const embed = new EmbedBuilder()
          .setColor('#0099CC')
          .setTitle(`👨‍✈️ ${pilot.name}`)
          .addFields(
            { name: '🆔 ID', value: pilot.pilot_id ?? '—', inline: true },
            { name: '🎖 Rang', value: pilot.rank?.name ?? '—', inline: true },
            { name: '📍 Position', value: pilot.curr_airport_id ?? '—', inline: true },
            { name: '✈ Vols', value: String(pilot.flights ?? 0), inline: true },
            { name: '⏱ Heures', value: `${Math.floor((pilot.flight_time ?? 0)/60)}h`, inline: true },
            { name: '📊 Score moyen', value: pilot.score ? `${pilot.score}%` : '—', inline: true },
          )
          .setFooter({ text: 'French Bee Virtual · ICAO FBU' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'metar': {
        const icao = interaction.options.getString('icao').toUpperCase();
        const { data } = await axios.get(`https://metar.vatsim.net/metar.php?id=${icao}`, { timeout: 5000 });
        const embed = new EmbedBuilder()
          .setColor('#1B3A6B')
          .setTitle(`🌤 METAR ${icao}`)
          .setDescription(`\`\`\`${data || 'METAR non disponible'}\`\`\``)
          .setFooter({ text: 'Source: VATSIM METAR' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'fbu': {
        const embed = new EmbedBuilder()
          .setColor('#0099CC')
          .setTitle('🐝 French Bee Virtual')
          .setDescription('La compagnie virtuelle qui recrée l\'expérience French Bee sur MSFS 2020 & 2024.')
          .addFields(
            { name: '✈ ICAO', value: 'FBU', inline: true },
            { name: '🛫 Hub', value: 'Paris-Orly (LFPO)', inline: true },
            { name: '🛩 Flotte', value: 'A350-900 / ULR / A350-1000', inline: true },
            { name: '🌍 Destinations', value: 'La Réunion, Martinique, Guadeloupe, San Francisco, Singapour, Tahiti, Honolulu' },
            { name: '🔗 Crew Center', value: 'https://newhorisons.com', inline: true },
            { name: '💬 Discord', value: 'https://discord.gg/VDmSYqC34W', inline: true },
          )
          .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'panel': {
        if (!interaction.member.permissions.has('Administrator')) {
          await interaction.editReply('❌ Réservé aux admins.');
          return;
        }
        const { postRecruitmentPanel } = require('./recruitment');
        await postRecruitmentPanel(interaction.channel);
        await interaction.editReply('✅ Panel posté !');
        break;
      }

      default:
        await interaction.editReply('Commande inconnue.');
    }
  } catch (err) {
    console.error(`Erreur commande ${interaction.commandName}:`, err.message);
    await interaction.editReply('❌ Une erreur est survenue.').catch(() => {});
  }
}

module.exports = { loadCommands, handleCommand };
