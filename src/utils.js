const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

/**
 * Obtient le chemin d'installation de Riot Client Services à partir du fichier de configuration
 * @returns {string|null} - Le chemin d'installation de Riot Client Services ou null si non trouvé
 */
function getRiotClientServicesPath() {
  const installPath = path.join(process.env.ALLUSERSPROFILE, 'Riot Games', 'RiotClientInstalls.json');

  // Vérifie si le fichier d'installation existe
  if (!fs.existsSync(installPath)) {
    return null;
  }

  try {
    // Lit et parse le fichier JSON
    const data = JSON.parse(fs.readFileSync(installPath, 'utf-8'));
    const rcPaths = [data.rc_default, data.rc_live, data.rc_beta].filter(Boolean);

    // Retourne le premier chemin valide trouvé
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

/**
 * Vérifie si le client Riot est en cours d'exécution
 * @returns {boolean} - true si le client Riot est en cours d'exécution, false sinon
 */
function isRiotClientRunning() {
  try {
    const output = execSync('tasklist', { encoding: 'utf8' });
    // Vérifie si les processus RiotClientServices.exe ou LeagueClient.exe sont en cours d'exécution
    return output.includes('RiotClientServices.exe') || output.includes('LeagueClient.exe');
  } catch {
    return false;
  }
}

/**
 * Ferme le client Riot s'il est en cours d'exécution
 */
function closeRiotClient() {
  try {
    // Tente de fermer les processus RiotClientServices.exe et LeagueClient.exe
    spawnSync('taskkill', ['/f', '/im', 'RiotClientServices.exe', '/t']);
    spawnSync('taskkill', ['/f', '/im', 'LeagueClient.exe', '/t']);
  } catch (error) {
    console.error('Error closing RiotClient:', error);
  }
}

// Export des fonctions pour utilisation externe
module.exports = {
  getRiotClientServicesPath,
  isRiotClientRunning,
  closeRiotClient
};
