const { Tray, Menu, nativeImage, dialog, app } = require('electron');
const path = require('path');

class TrayManager {
  constructor(main) {
    this.tray = null;
    this.main = main;
  }

  /**
   * Crée l'icône de la barre d'état et initialise le menu contextuel
   */
  createTray() {
    const iconPath = path.join(__dirname, '..', 'resources', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.updateTray();
  }

  /**
   * Met à jour le menu contextuel de la barre d'état
   */
  updateTray() {
    const versionLabel = `Version: ${app.getVersion()}`;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: versionLabel,
        enabled: false
      },
      {
        label: 'Activé',
        type: 'checkbox',
        checked: this.main.enabled,
        click: async () => {
          this.main.enabled = !this.main.enabled;
          await this.main.updateStatus(this.main.enabled ? this.main.status : 'offline');
          this.updateTray();
        }
      },
      {
        label: 'Type de statut',
        submenu: [
          {
            label: 'En ligne',
            type: 'radio',
            checked: this.main.status === 'chat',
            click: async () => {
              await this.main.updateStatus('chat');
              this.main.enabled = true;
              this.updateTray();
            }
          },
          {
            label: 'Hors ligne',
            type: 'radio',
            checked: this.main.status === 'offline',
            click: async () => {
              await this.main.updateStatus('offline');
              this.main.enabled = true;
              this.updateTray();
            }
          },
          {
            label: 'Riot Mobile',
            type: 'radio',
            checked: this.main.status === 'mobile',
            click: async () => {
              await this.main.updateStatus('mobile');
              this.main.enabled = true;
              this.updateTray();
            }
          }
        ]
      },
      {
        label: 'Quitter',
        click: () => {
          const result = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Oui', 'Non'],
            title: 'Spectral',
            message: 'Êtes-vous sûr de vouloir quitter Spectral ?',
          });

          if (result === 0) {
            app.quit();
          }
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }
}

module.exports = TrayManager;
