const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function getRiotClientServicesPath() {
  const installPath = path.join(process.env.ALLUSERSPROFILE, 'Riot Games', 'RiotClientInstalls.json');

  if (!fs.existsSync(installPath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(installPath, 'utf-8'));
    const rcPaths = [data.rc_default, data.rc_live, data.rc_beta].filter(Boolean);

    for (const rcPath of rcPaths) {
      if (fs.existsSync(rcPath)) {
        return rcPath;
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading or parsing RiotClientInstalls.json:', error);
    return null;
  }
}

function isRiotClientRunning() {
  try {
    const output = execSync('tasklist', { encoding: 'utf8' });
    return output.includes('RiotClientServices.exe', 'LeagueClient.exe');
  } catch {
    return false;
  }
}

function closeRiotClient() {
  try {
    spawnSync('taskkill', ['/f', '/im', 'RiotClientServices.exe', '/t']);
    spawnSync('taskkill', ['/f', '/im', 'LeagueClient.exe', '/t']);
  } catch (error) {
    console.error('Error closing RiotClient:', error);
  }
}


module.exports = {
  getRiotClientServicesPath,
  isRiotClientRunning,
  closeRiotClient
};