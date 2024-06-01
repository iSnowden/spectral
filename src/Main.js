const { app, dialog, Notification } = require('electron');
const net = require('net');
const tls = require('tls');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const TrayManager = require('./TrayManager');
const Proxy = require('./Proxy');
const utils = require('./utils');
const ChatConnection = require('./ChatConnection');

class Main {
  constructor() {
    // Initialisation des propriétés de l'application
    this.store = null;
    this.trayManager = null;
    this.proxy = null;
    this.riotClientPath = utils.getRiotClientServicesPath();
    this.configUpdated = false;
    this.server = null;
    this.chatHost = null;
    this.chatPort = 0;
    this.enabled = true;
    this.status = 'offline';
    this.connections = [];

    // Initialise l'importation dynamique de electron-store
    this.initStore();
  }

  /**
   * Initialise le stockage en chargeant le module electron-store dynamiquement
   */
  async initStore() {
    const Store = (await import('electron-store')).default;
    this.store = new Store();
    this.status = this.store.get('userPreferences.status') ?? 'offline';
  }

  /**
   * Initialise l'application principale
   */
  async init() {
    // Attendre que le store soit initialisé
    while (!this.store) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Vérifie si le client Riot est en cours d'exécution et demande à l'utilisateur s'il souhaite continuer
    if (utils.isRiotClientRunning()) {
      const result = await new Promise((resolve) => {
        dialog.showMessageBox({
          type: 'question',
          buttons: ['Oui', 'Non'],
          title: 'Spectral',
          message: "Il semble que le client Riot soit déjà en cours d'exécution. Spectral doit redémarrer le client pour fonctionner correctement. Voulez-vous continuer ?",
          defaultId: 0
        }).then(response => resolve(response.response));
      });

      if (result === 1) {
        app.quit();
      } else {
        this.showNotification('Spectral', 'Redémarrage du client Riot en cours...');
        utils.closeRiotClient();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Crée l'icône de la barre d'état
    this.trayManager = new TrayManager(this);
    this.trayManager.createTray();

    // Vérifie si le chemin du client Riot est valide
    await this.checkRiotClientPath();

    // Démarre le proxy
    await this.runProxy();

    // Attendre l'initialisation du proxy
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Démarre League of Legends
    await this.startLeagueOfLegends();

    // Attendre la mise à jour des configurations de chat
    await this.waitForChatConfig();

    // Crée une connexion de chat
    this.createConnection();

    // Affiche une notification
    this.showNotification('Spectral', 'Spectral gère maintenant votre statut de chat. Cliquez sur l\'icône de la barre d\'état pour afficher les options.');
  }

  /**
   * Démarre le proxy pour intercepter les communications
   */
  async runProxy() {
    this.server = net.createServer();
    this.server.listen(0, '127.0.0.1', async () => {
      const port = this.server.address().port;
      this.proxy = new Proxy(port);
      await this.proxy.initialize();

      this.proxy.on('updatedConfig', (args) => {
        this.configUpdated = true;
        this.chatHost = args.riotChatHost;
        this.chatPort = args.riotChatPort;
      });
    });
  }

  /**
   * Attendre que la configuration de chat soit mise à jour
   */
  waitForChatConfig() {
    return new Promise((resolve) => {
      const checkConfig = () => {
        if (this.chatHost && this.chatPort) {
          resolve();
        } else {
          setTimeout(checkConfig, 100);
        }
      };
      checkConfig();
    });
  }

  /**
   * Vérifie si le chemin vers RiotClientServices est valide
   */
  async checkRiotClientPath() {
    if (!this.riotClientPath) {
      dialog.showMessageBoxSync({
        type: 'error',
        buttons: ['OK'],
        title: 'Spectral',
        message: "Impossible de trouver le chemin RiotClientServices. L'application va maintenant se fermer.",
      });
      app.quit();
    }
  }

  /**
   * Démarre League of Legends avec le proxy configuré
   */
  async startLeagueOfLegends() {
    if (!this.proxy) {
      console.error('Proxy not initialized. Cannot start League of Legends.');
      return;
    }

    const startArgs = [
      `--launch-product=league_of_legends`,
      `--launch-patchline=live`,
      `--client-config-url=http://127.0.0.1:${this.proxy.proxyPort}`
    ];

    const lolClient = spawn(this.riotClientPath, startArgs, { stdio: 'inherit' });

    if (lolClient) {
      lolClient.on('exit', (code) => {
        dialog.showMessageBoxSync({
          type: 'error',
          buttons: ['OK'],
          title: 'Spectral',
          message: "League of Legends a été fermé. Spectral va maintenant se fermer."
        });
        app.quit();
      });

      lolClient.on('error', (err) => {
        console.error('Failed to start League of Legends:', err);
        dialog.showMessageBoxSync({
          type: 'error',
          buttons: ['OK'],
          title: 'Spectral',
          message: "Impossible de lancer League of Legends.",
        });
        app.quit();
      });
    }
  }

  /**
   * Crée une connexion de chat sécurisée
   */
  async createConnection() {
    const options = {
      pfx: fs.readFileSync(path.join(__dirname, '..', 'resources', 'certificate.pfx')),
      passphrase: '',
      rejectUnauthorized: false
    };

    this.server.on('connection', (socket) => {
      const incoming = new tls.TLSSocket(socket, { isServer: true, ...options });
      incoming.once('secure', () => {
        const outgoing = tls.connect(this.chatPort, this.chatHost, { rejectUnauthorized: false }, () => {

          let chatConnection = new ChatConnection(this, incoming, outgoing);
          chatConnection.start();
          chatConnection.on('connectionErrored', () => {
            this.connections.splice(this.connections.indexOf(chatConnection), 1);
          });
          this.connections.push(chatConnection);
          
        });
      });
    });

    this.server.on('error', (error) => {
      console.error('Server error:', error);
    });
  }

  /**
   * Met à jour le statut de l'utilisateur
   * @param {string} status - Le nouveau statut à définir
   */
  updateStatus(status) {
    for (const connection of this.connections) {
      connection.updateStatus(status);
      this.status = status;
      this.store.set('userPreferences.status', this.status);
      this.showNotification('Spectral', `Votre statut a été mis à jour: ${status}`);
    }
  }

  /**
   * Affiche une notification système
   * @param {string} title - Le titre de la notification
   * @param {string} body - Le corps de la notification
   */
  showNotification(title, body) {
    const notification = new Notification({
      title: title,
      body: body,
    });

    notification.show();
  }
}

module.exports = Main;
