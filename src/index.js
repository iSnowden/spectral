const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Main = require('./Main');

// Configurer les logs pour autoUpdater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function sendStatusToWindow(text) {
  log.info(text);
}

// Configurer le point d'entrée pour la mise à jour automatique
function initAutoUpdate() {

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.');
    dialog.showMessageBox({
      type: 'info',
      title: 'Mise à jour disponible',
      message: 'Une nouvelle version est disponible. Voulez-vous mettre à jour maintenant ?',
      buttons: ['Oui', 'Non']
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message += ' - Downloaded ' + progressObj.percent + '%';
    log_message += ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded; will install now');
    dialog.showMessageBox({
      type: 'info',
      title: 'Mise à jour téléchargée',
      message: 'Installer et redémarrer maintenant ?',
      buttons: ['Oui', 'Plus tard']
    }).then(result => {
      if (result.response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    });
  });

  // Vérifie les mises à jour
  autoUpdater.checkForUpdatesAndNotify();
}

// Déclaration de la variable 'main' pour stocker l'instance principale de l'application
let main = null;

// Événement déclenché lorsque l'application est prête
app.on('ready', async () => {
  // Définir l'identifiant du modèle utilisateur de l'application sous Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.name);
  }

  // Initialisation du système de mise à jour automatique
  initAutoUpdate();
  
  // Création de l'instance de l'application principale
  main = new Main();
  
  // Initialisation de l'application principale
  await main.init();
});
