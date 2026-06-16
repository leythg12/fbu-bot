const axios = require('axios');
const cfg   = require('./config');

const phpvms = axios.create({
  baseURL: `${cfg.PHPVMS_URL}/api`,
  headers: { 'X-API-Key': cfg.PHPVMS_KEY, 'Accept': 'application/json' },
  timeout: 10000,
});

const dbapi = axios.create({
  baseURL: `${cfg.PHPVMS_URL}/dbapi`,
  headers: { 'X-Service-Key': cfg.DBASIC_KEY, 'Accept': 'application/json' },
  timeout: 10000,
});

async function getStatus()       { return (await phpvms.get('/status')).data; }
async function getPireps(n=5)    { return (await phpvms.get(`/pireps?limit=${n}&state=2`)).data?.data ?? []; }
async function getPilots(n=20)   { return (await phpvms.get(`/pilots?limit=${n}&status=active`)).data?.data ?? []; }
async function getPilot(id)      { return (await phpvms.get(`/users/${id}`)).data?.data ?? null; }
async function getFlights(q='')  { return (await phpvms.get(`/flights?${q}&limit=10`)).data?.data ?? []; }
async function getAirline()      { return (await phpvms.get('/airlines/1')).data?.data ?? {}; }
async function getStats()        { try { return (await dbapi.get('/stats')).data?.data ?? null; } catch { return null; } }
async function getRoster()       { try { return (await dbapi.get('/roster')).data?.data ?? []; } catch { return []; } }

async function getMetar(icao) {
  const { data } = await axios.get(`https://metar.vatsim.net/metar.php?id=${icao}`, { timeout: 5000 });
  return data?.trim() || null;
}

async function getVatsimFlights() {
  try {
    const { data } = await axios.get('https://data.vatsim.net/v3/vatsim-data.json', { timeout: 8000 });
    return (data?.pilots ?? []).filter(p =>
      p.callsign?.startsWith('BEE') || p.flight_plan?.remarks?.includes('FBU')
    );
  } catch { return []; }
}

module.exports = { getStatus, getPireps, getPilots, getPilot, getFlights, getAirline, getStats, getRoster, getMetar, getVatsimFlights };
