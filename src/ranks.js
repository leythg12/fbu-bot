// Mapping rangs phpVMS → rôles Discord
// Clé = nom exact du rang dans phpVMS
const RANK_ROLES = {
  'Élève Pilote':                  '1515372866441318522',
  'Cadet':                         '1515372820127944947',
  'Cadet Confirmé':                '1515372766231007445',
  'Premier Officier':              '1515372718290243624',
  'Premier Officier Senior':       '1515372680176603306',
  'Commandant de Bord':            '1515372626820727035',
  'Commandant de Bord Senior':     '1515372584978481253',
  'Commandant de Bord Instructeur':'1515372534369882195',
  'Chief Pilot':                   '1515370748250689657',
};

// Tous les IDs de rôles rangs (pour nettoyer avant d'en assigner un nouveau)
const ALL_RANK_ROLE_IDS = Object.values(RANK_ROLES);

/**
 * Assigne le bon rôle de rang à un membre Discord
 * et supprime les anciens rôles de rang
 */
async function assignRankRole(member, rankName) {
  try {
    const guild = member.guild;

    // Supprimer tous les anciens rôles de rang
    const toRemove = member.roles.cache.filter(r => ALL_RANK_ROLE_IDS.includes(r.id));
    for (const [, role] of toRemove) {
      await member.roles.remove(role).catch(() => {});
    }

    // Assigner le nouveau rôle
    const newRoleId = RANK_ROLES[rankName];
    if (newRoleId) {
      const role = guild.roles.cache.get(newRoleId);
      if (role) {
        await member.roles.add(role);
        return role.name;
      }
    }
    return null;
  } catch (err) {
    console.error('assignRankRole error:', err.message);
    return null;
  }
}

module.exports = { RANK_ROLES, ALL_RANK_ROLE_IDS, assignRankRole };
