module.exports = {
  PHPVMS_URL:   process.env.PHPVMS_URL   || 'https://newhorisons.com',
  PHPVMS_KEY:   process.env.PHPVMS_API_KEY,
  DBASIC_KEY:   process.env.DBASIC_API_KEY,
  GUILD_ID:     process.env.DISCORD_GUILD_ID,
  CLIENT_ID:    process.env.DISCORD_CLIENT_ID,

  CHANNELS: {
    PIREPS:         process.env.CHANNEL_PIREPS,
    WELCOME:        process.env.CHANNEL_WELCOME,
    ANNOUNCEMENTS:  process.env.CHANNEL_ANNOUNCEMENTS,
    ROSTER:         process.env.CHANNEL_ROSTER,
    LOGS:           process.env.CHANNEL_LOGS,
    METAR:          process.env.CHANNEL_METAR,
  },

  ROLES: {
    PILOT:          process.env.ROLE_PILOT,
    ELEVE:          '1515372866441318522',
    CADET:          '1515372820127944947',
    CADET_CONFIRME: '1515372766231007445',
    PREMIER_OFF:    '1515372718290243624',
    PREMIER_OFF_SR: '1515372680176603306',
    CDB:            '1515372626820727035',
    CDB_SENIOR:     '1515372584978481253',
    CDB_INSTR:      '1515372534369882195',
    CHIEF_PILOT:    '1515370748250689657',
  },

  RANK_TO_ROLE: {
    'Élève Pilote':                  '1515372866441318522',
    'Cadet':                         '1515372820127944947',
    'Cadet Confirmé':                '1515372766231007445',
    'Premier Officier':              '1515372718290243624',
    'Premier Officier Senior':       '1515372680176603306',
    'Commandant de Bord':            '1515372626820727035',
    'Commandant de Bord Senior':     '1515372584978481253',
    'Commandant de Bord Instructeur':'1515372534369882195',
    'Chief Pilot':                   '1515370748250689657',
  },

  ALL_RANK_ROLES: [
    '1515372866441318522','1515372820127944947','1515372766231007445',
    '1515372718290243624','1515372680176603306','1515372626820727035',
    '1515372584978481253','1515372534369882195','1515370748250689657',
  ],

  DISCORD_LINK: 'https://discord.gg/VDmSYqC34W',
  CREW_CENTER:  'https://newhorisons.com',
};
