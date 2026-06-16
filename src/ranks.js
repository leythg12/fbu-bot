const cfg = require('./config');

async function assignRankRole(member, rankName) {
  try {
    const guild = member.guild;
    const toRemove = member.roles.cache.filter(r => cfg.ALL_RANK_ROLES.includes(r.id));
    for (const [, role] of toRemove) await member.roles.remove(role).catch(() => {});
    const newRoleId = cfg.RANK_TO_ROLE[rankName];
    if (newRoleId) {
      const role = guild.roles.cache.get(newRoleId);
      if (role) { await member.roles.add(role); return role.name; }
    }
    return null;
  } catch (err) { console.error('assignRankRole:', err.message); return null; }
}

module.exports = { assignRankRole };
