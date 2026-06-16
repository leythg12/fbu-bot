const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelType, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const cfg = require('./config');

const EPH = { flags: MessageFlags.Ephemeral };

async function postRecruitmentPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor('#0099CC')
    .setTitle('🐝 Rejoindre French Bee Virtual')
    .setDescription(
      '**Bienvenue sur le portail de recrutement de French Bee Virtual !**\n\n' +
      'Clique sur le bouton correspondant à ta candidature :\n\n' +
      '**🧑‍✈️ Candidature Pilote** — Tu veux voler avec nous\n' +
      '**👨‍💼 Candidature Staff** — Tu veux rejoindre l\'équipe\n\n' +
      '_Un membre du staff te répondra dès que possible._'
    )
    .setFooter({ text: 'French Bee Virtual · ICAO FBU · Paris-Orly' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_pilot').setLabel('🧑‍✈️ Candidature Pilote').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_staff').setLabel('👨‍💼 Candidature Staff').setStyle(ButtonStyle.Secondary),
  );
  await channel.send({ embeds: [embed], components: [row] });
}

async function createTicket(interaction, type) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guild  = interaction.guild;
    const user   = interaction.user;
    const suffix = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const chName = `ticket-${type === 'pilot' ? 'pilote' : 'recrutement'}-${suffix}-${Math.floor(Math.random()*9000+1000)}`;

    const overrides = [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
    ];
    guild.roles.cache
      .filter(r => ['fondateur','président','staff','admin'].some(s => r.name.toLowerCase().includes(s)))
      .forEach(r => overrides.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }));

    const ticketChannel = await guild.channels.create({
      name: chName, type: ChannelType.GuildText, permissionOverwrites: overrides,
    });

    const embed = new EmbedBuilder()
      .setColor(type === 'pilot' ? '#0099CC' : '#FF6B35')
      .setTitle(type === 'pilot' ? '🧑‍✈️ Candidature Pilote' : '👨‍💼 Candidature Staff')
      .setDescription(`Bonjour ${user} ! Ton ticket est créé.\n\nFondateurs et staff ont été notifiés.\n\n_Clique sur **Formulaire** pour remplir ta candidature._`)
      .setFooter({ text: `French Bee Virtual · ${chName}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`form_${type}_${user.id}`).setLabel('📋 Formulaire').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`notify_${user.id}`).setLabel('📢 Prévenir').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`accept_${user.id}`).setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${user.id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`close_${ticketChannel.id}`).setLabel('🔴 Fermer').setStyle(ButtonStyle.Danger),
    );

    await ticketChannel.send({ embeds: [embed], components: [row, row2] });

    const adminRoles = guild.roles.cache.filter(r => ['fondateur','président'].some(s => r.name.toLowerCase().includes(s)));
    const mentions = adminRoles.map(r => `<@&${r.id}>`).join(' ');
    if (mentions) await ticketChannel.send(`${mentions} — Nouvelle candidature de ${user} !`);

    await interaction.editReply({ content: `✅ Ton ticket a été créé : ${ticketChannel}` });
  } catch (err) {
    console.error('createTicket:', err.message);
    await interaction.editReply({ content: '❌ Erreur lors de la création du ticket.' });
  }
}

async function showPilotForm(interaction) {
  // showModal ne peut pas être précédé d'un defer
  const modal = new ModalBuilder().setCustomId(`modal_pilot_${interaction.user.id}`).setTitle('✈ Candidature Pilote — FBU');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Prénom et Nom').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Âge').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('simulator').setLabel('Simulateur utilisé').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('MSFS 2024, MSFS 2020...')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('network').setLabel('Réseau (VATSIM/IVAO/aucun)').setStyle(TextInputStyle.Short).setRequired(false)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivation').setLabel('Expérience & motivation').setStyle(TextInputStyle.Paragraph).setRequired(true)),
  );
  await interaction.showModal(modal);
}

async function showStaffForm(interaction) {
  const modal = new ModalBuilder().setCustomId(`modal_staff_${interaction.user.id}`).setTitle('👨‍💼 Candidature Staff — FBU');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Prénom et Nom').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Âge').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('poste').setLabel('Poste souhaité').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Expérience staff Discord/VA').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivation').setLabel('Pourquoi rejoindre le staff FBU ?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
  );
  await interaction.showModal(modal);
}

async function postFormResult(interaction, type, fields) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const embed = new EmbedBuilder()
      .setColor(type === 'pilot' ? '#0099CC' : '#FF6B35')
      .setTitle('📋 Formulaire soumis')
      .setDescription(`Complété par ${interaction.user}`)
      .setTimestamp();

    if (type === 'pilot') {
      embed.addFields(
        { name: '👤 Discord',    value: interaction.user.username, inline: true },
        { name: '🧑 Nom',       value: fields.name, inline: true },
        { name: '🎂 Âge',       value: fields.age, inline: true },
        { name: '🖥 Simulateur',value: fields.simulator, inline: true },
        { name: '🌐 Réseau',    value: fields.network || 'Non renseigné', inline: true },
        { name: '💬 Motivation',value: fields.motivation },
      );
    } else {
      embed.addFields(
        { name: '👤 Discord',      value: interaction.user.username, inline: true },
        { name: '🧑 Nom',         value: fields.name, inline: true },
        { name: '🎂 Âge',         value: fields.age, inline: true },
        { name: '🎯 Poste',       value: fields.poste, inline: true },
        { name: '📋 Expérience',  value: fields.experience },
        { name: '💬 Motivation',  value: fields.motivation },
      );
    }
    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: '✅ Formulaire soumis !' });
  } catch (err) {
    console.error('postFormResult:', err.message);
    await interaction.editReply({ content: '❌ Erreur.' });
  }
}

async function notifyPlayer(interaction, targetUserId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (!member) { await interaction.editReply({ content: '❌ Membre introuvable.' }); return; }
    const embed = new EmbedBuilder()
      .setColor('#FF6B35').setTitle('📢 Un modérateur te contacte')
      .setDescription(`Un membre du staff souhaite discuter avec toi au sujet de ton ticket **${interaction.channel?.name ?? ''}**.\n\n**Viens vérifier le ticket rapidement !**`)
      .setFooter({ text: `French Bee Virtual · par ${interaction.user.username}` }).setTimestamp();
    try {
      await member.send({ embeds: [embed] });
      await interaction.editReply({ content: `✅ ${member} a été prévenu par MP.` });
    } catch {
      await interaction.editReply({ content: `❌ MPs désactivés pour ${member}.` });
    }
  } catch (err) {
    console.error('notifyPlayer:', err.message);
    await interaction.editReply({ content: '❌ Erreur.' });
  }
}

async function acceptCandidate(interaction, targetUserId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guild  = interaction.guild;
    const member = await guild.members.fetch(targetUserId).catch(() => null);
    const embed  = new EmbedBuilder().setColor('#22C55E').setTitle('✅ Candidature acceptée !')
      .setDescription(`Félicitations ! Ta candidature chez **French Bee Virtual** a été **acceptée** ! 🐝\n\nInscris-toi sur notre crew center : **${cfg.CREW_CENTER}/register**`)
      .setFooter({ text: `par ${interaction.user.username}` }).setTimestamp();
    if (member) {
      await member.send({ embeds: [embed] }).catch(() => {});
      const role = guild.roles.cache.get(cfg.ROLES.PILOT ?? cfg.ROLES.ELEVE);
      if (role) await member.roles.add(role).catch(() => {});
    }
    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: '✅ Candidature acceptée !' });
  } catch (err) {
    console.error('acceptCandidate:', err.message);
    await interaction.editReply({ content: '❌ Erreur.' });
  }
}

async function rejectCandidate(interaction, targetUserId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    const embed  = new EmbedBuilder().setColor('#EF4444').setTitle('❌ Candidature non retenue')
      .setDescription(`Merci pour ta candidature chez **French Bee Virtual**.\n\nMalheureusement nous ne pouvons pas donner suite pour le moment. N'hésite pas à repostuler ! 🐝`)
      .setFooter({ text: `par ${interaction.user.username}` }).setTimestamp();
    if (member) await member.send({ embeds: [embed] }).catch(() => {});
    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: 'Candidature refusée.' });
  } catch (err) {
    console.error('rejectCandidate:', err.message);
    await interaction.editReply({ content: '❌ Erreur.' });
  }
}

async function closeTicket(interaction, channelId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const channel = interaction.guild.channels.cache.get(channelId) ?? interaction.channel;
    const embed = new EmbedBuilder().setColor('#6B7280').setTitle('🔴 Ticket fermé')
      .setDescription(`Fermé par ${interaction.user}. Suppression dans 5 secondes.`).setTimestamp();
    await channel.send({ embeds: [embed] });
    await interaction.editReply({ content: 'Ticket fermé.' });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error('closeTicket:', err.message);
    await interaction.editReply({ content: '❌ Erreur.' });
  }
}

module.exports = { postRecruitmentPanel, createTicket, showPilotForm, showStaffForm, postFormResult, notifyPlayer, acceptCandidate, rejectCandidate, closeTicket };
