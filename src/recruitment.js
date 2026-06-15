const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, ChannelType, PermissionFlagsBits
} = require('discord.js');

// ── Poster le message d'ouverture de ticket dans #ouvrir-un-ticket ──
async function postRecruitmentPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor('#0099CC')
    .setTitle('🐝 Rejoindre French Bee Virtual')
    .setDescription(
      'Bienvenue sur le portail de recrutement de **French Bee Virtual** !\n\n' +
      'Clique sur le bouton correspondant à ton souhait pour ouvrir un ticket.\n\n' +
      '**🧑‍✈️ Pilote** — Tu veux rejoindre la VA en tant que pilote\n' +
      '**👨‍💼 Staff** — Tu veux rejoindre l\'équipe de modération/staff\n\n' +
      '_Un membre du staff te répondra dès que possible._'
    )
    .setThumbnail('attachment://logo.png')
    .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_pilot')
      .setLabel('✈ Candidature Pilote')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_staff')
      .setLabel('👨‍💼 Candidature Staff')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── Créer un ticket ─────────────────────────────────────────────────
async function createTicket(interaction, type) {
  const guild   = interaction.guild;
  const user    = interaction.user;
  const suffix  = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const chName  = `ticket-${type === 'pilot' ? 'pilote' : 'recrutement'}-${suffix}-${Math.floor(Math.random()*9000+1000)}`;

  // Chercher ou créer catégorie
  let category = guild.channels.cache.find(c =>
    c.type === ChannelType.GuildCategory &&
    c.name.toLowerCase().includes(type === 'pilot' ? 'pilote' : 'recrutement')
  );

  // Créer le salon privé
  const ticketChannel = await guild.channels.create({
    name: chName,
    type: ChannelType.GuildText,
    parent: category?.id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      // Donner accès aux admins/fondateurs
      ...guild.roles.cache
        .filter(r => ['admin','fondateur','président','staff'].some(s => r.name.toLowerCase().includes(s)))
        .map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
    ],
  });

  const embed = new EmbedBuilder()
    .setColor(type === 'pilot' ? '#0099CC' : '#FF6B35')
    .setTitle(type === 'pilot' ? '✈ Candidature Pilote' : '👨‍💼 Candidature Staff')
    .setDescription(
      `Bonjour ${user} ! Ton ticket de ${type === 'pilot' ? 'candidature pilote' : 'recrutement staff'} est créé.\n\n` +
      `Fondateurs et Président ont été notifiés.\n` +
      `Un membre du staff va te répondre rapidement.\n\n` +
      `_Clique sur **Formulaire** pour remplir ta candidature._`
    )
    .setFooter({ text: `French Bee Virtual · ${chName}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`form_${type}_${user.id}`)
      .setLabel('📋 Remplir le formulaire')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`notify_${user.id}`)
      .setLabel('📢 Prévenir le joueur')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`transcript_${ticketChannel.id}`)
      .setLabel('📄 Transcript')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`close_${ticketChannel.id}`)
      .setLabel('🔴 Fermer')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({ embeds: [embed], components: [row] });

  // Notifier les fondateurs
  const adminRoles = guild.roles.cache.filter(r =>
    ['fondateur','président'].some(s => r.name.toLowerCase().includes(s))
  );
  const mentions = adminRoles.map(r => `<@&${r.id}>`).join(' ');
  if (mentions) await ticketChannel.send(`${mentions} — Nouvelle candidature de ${user} !`);

  await interaction.reply({
    content: `✅ Ton ticket a été créé : ${ticketChannel}`,
    ephemeral: true,
  });
}

// ── Formulaire pilote (Modal) ───────────────────────────────────────
async function showPilotForm(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_pilot_${interaction.user.id}`)
    .setTitle('✈ Candidature Pilote — French Bee Virtual');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Prénom et Nom').setStyle(TextInputStyle.Short).setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('age').setLabel('Âge').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('simulator').setLabel('Simulateur utilisé').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('MSFS 2024, MSFS 2020, P3D...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('network').setLabel('Réseau online (VATSIM/IVAO/aucun)').setStyle(TextInputStyle.Short).setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('motivation').setLabel('Motivation / Expérience simulation').setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('Parle-nous de ton expérience et pourquoi tu veux rejoindre FBU...')
    ),
  );

  await interaction.showModal(modal);
}

// ── Formulaire staff (Modal) ────────────────────────────────────────
async function showStaffForm(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_staff_${interaction.user.id}`)
    .setTitle('👨‍💼 Candidature Staff — French Bee Virtual');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Prénom et Nom').setStyle(TextInputStyle.Short).setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('age').setLabel('Âge').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('poste').setLabel('Poste souhaité').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Modérateur, Responsable formation, Responsable events...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('experience').setLabel('Expérience staff Discord/VA').setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('Décris ton expérience dans des équipes staff...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('motivation').setLabel('Pourquoi rejoindre le staff FBU ?').setStyle(TextInputStyle.Paragraph).setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}

// ── Afficher le résultat du formulaire dans le ticket ───────────────
async function postFormResult(interaction, type, fields) {
  const channel = interaction.channel;

  const embed = new EmbedBuilder()
    .setColor(type === 'pilot' ? '#0099CC' : '#FF6B35')
    .setTitle(`📋 Formulaire de candidature soumis`)
    .setDescription(`Formulaire complété par ${interaction.user}`)
    .setTimestamp();

  if (type === 'pilot') {
    embed.addFields(
      { name: '👤 Pseudo Discord', value: interaction.user.username, inline: true },
      { name: '🧑 Nom et prénom', value: fields.name ?? '—', inline: true },
      { name: '🎂 Âge', value: fields.age ?? '—', inline: true },
      { name: '🖥️ Simulateur', value: fields.simulator ?? '—', inline: true },
      { name: '🌐 Réseau', value: fields.network || 'Non renseigné', inline: true },
      { name: '💬 Motivation', value: fields.motivation ?? '—', inline: false },
    );
  } else {
    embed.addFields(
      { name: '👤 Pseudo Discord', value: interaction.user.username, inline: true },
      { name: '🧑 Nom et prénom', value: fields.name ?? '—', inline: true },
      { name: '🎂 Âge', value: fields.age ?? '—', inline: true },
      { name: '🎯 Poste souhaité', value: fields.poste ?? '—', inline: true },
      { name: '📋 Expérience staff', value: fields.experience ?? '—', inline: false },
      { name: '💬 Motivation', value: fields.motivation ?? '—', inline: false },
    );
  }

  // Boutons de décision
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${interaction.user.id}`)
      .setLabel('✅ J\'accepte')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel('❌ Je refuse')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`notify_${interaction.user.id}`)
      .setLabel('📢 Prévenir le joueur')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Formulaire soumis !', ephemeral: true });
}

// ── Prévenir le joueur (DM) ─────────────────────────────────────────
async function notifyPlayer(interaction, targetUserId) {
  const guild  = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);
  if (!member) {
    await interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF6B35')
    .setTitle('📢 Un modérateur te contacte')
    .setDescription(
      `Un membre du staff souhaite discuter avec toi au sujet de ton ticket **${interaction.channel?.name ?? ''}**.\n\n` +
      `**Viens vérifier le ticket rapidement !**`
    )
    .setFooter({ text: `French Bee Virtual · par ${interaction.user.username}` })
    .setTimestamp();

  try {
    await member.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ ${member} a été prévenu par message privé.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: `❌ Impossible d'envoyer un MP à ${member} (MPs désactivés).`, ephemeral: true });
  }
}

// ── Accepter / Refuser ──────────────────────────────────────────────
async function acceptCandidate(interaction, targetUserId) {
  const guild  = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor('#22C55E')
    .setTitle('✅ Candidature acceptée !')
    .setDescription(
      `Félicitations ! Ta candidature chez **French Bee Virtual** a été **acceptée** ! 🐝\n\n` +
      `Tu vas recevoir tes accès prochainement. Bienvenue dans l'équipage !\n\n` +
      `👉 Inscris-toi sur notre crew center : **newhorisons.com/register**`
    )
    .setFooter({ text: `French Bee Virtual · par ${interaction.user.username}` })
    .setTimestamp();

  if (member) {
    await member.send({ embeds: [embed] }).catch(() => {});

    // Assigner rôle pilote
    const pilotRole = guild.roles.cache.get(process.env.ROLE_PILOT);
    if (pilotRole) await member.roles.add(pilotRole).catch(() => {});
  }

  await interaction.channel.send({ embeds: [embed] });
  await interaction.reply({ content: `✅ Candidature de ${member ?? targetUserId} acceptée !`, ephemeral: true });
}

async function rejectCandidate(interaction, targetUserId) {
  const guild  = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('❌ Candidature non retenue')
    .setDescription(
      `Nous avons bien examiné ta candidature chez **French Bee Virtual**.\n\n` +
      `Malheureusement, nous ne pouvons pas donner suite pour le moment.\n` +
      `N'hésite pas à repostuler dans le futur !\n\n` +
      `Merci de l'intérêt que tu portes à notre compagnie. 🐝`
    )
    .setFooter({ text: `French Bee Virtual · par ${interaction.user.username}` })
    .setTimestamp();

  if (member) await member.send({ embeds: [embed] }).catch(() => {});

  await interaction.channel.send({ embeds: [embed] });
  await interaction.reply({ content: `Candidature refusée.`, ephemeral: true });
}

// ── Fermer le ticket ────────────────────────────────────────────────
async function closeTicket(interaction, channelId) {
  const channel = interaction.guild.channels.cache.get(channelId) ?? interaction.channel;

  const embed = new EmbedBuilder()
    .setColor('#6B7280')
    .setTitle('🔴 Ticket fermé')
    .setDescription(`Ticket fermé par ${interaction.user}. Ce salon sera supprimé dans 5 secondes.`)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: 'Ticket fermé.', ephemeral: true });

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

module.exports = {
  postRecruitmentPanel,
  createTicket,
  showPilotForm,
  showStaffForm,
  postFormResult,
  notifyPlayer,
  acceptCandidate,
  rejectCandidate,
  closeTicket,
};
