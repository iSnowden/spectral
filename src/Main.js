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

  async initStore() {
    const Store = (await import('electron-store')).default;
    this.store = new Store();
    this.status = this.store.get('userPreferences.status') ?? 'offline';
  }

  async init() {
    // Attendre que le store soit initialisé
    while (!this.store) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (utils.isRiotClientRunning()) {
      const result = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Oui', 'Non'],
        title: 'Spectral',
        message: "Il semble que le client Riot soit déjà en cours d'exécution. Spectral doit redémarrer le client pour fonctionner correctement. Voulez-vous continuer ?",
        defaultId: 0
      });

      if (result === 1) {
        app.quit();
      } else {
        utils.killRiotClient();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Create the tray
    this.trayManager = new TrayManager(this);
    this.trayManager.createTray();

    // Check if the RiotClientServices path is valid
    await this.checkRiotClientPath();

    // Start the proxy
    await this.runProxy();

    // Wait for the proxy to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start League of Legends
    await this.startLeagueOfLegends();

    // Wait for the chat host and port to be updated
    await this.waitForChatConfig();

    // Create a connection
    this.createConnection();
  }

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
        console.log(`The original chat server details were ${args.riotChatHost}:${args.riotChatPort}`);
      });
    });
  }

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
    console.log('Starting League of Legends with args:', startArgs);

    const lolClient = spawn(this.riotClientPath, startArgs, { stdio: 'inherit' });

    if (lolClient) {
      lolClient.on('exit', (code) => {
        console.log(`League of Legends exited with code ${code}`);
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

  async createConnection() {
    const options = {
      pfx: fs.readFileSync(path.join(__dirname, '..', 'resources', 'certificate.pfx')),
      passphrase: '',
      rejectUnauthorized: false
    };

    console.log('Starting server...', this.chatHost, this.chatPort);
    console.log(this.server.address());

    this.server.on('connection', (socket) => {
      console.log('Incoming connection');
      const incoming = new tls.TLSSocket(socket, { isServer: true, ...options });
      incoming.once('secure', () => {
        const outgoing = tls.connect(this.chatPort, this.chatHost, { rejectUnauthorized: false }, () => {
          console.log(`Connected to ${this.chatHost}:${this.chatPort}`);

          let chatConnexion = new ChatConnection(this, incoming, outgoing);
          chatConnexion.start();
          chatConnexion.on('connectionErrored', () => {
            this.connections.splice(this.connections.indexOf(chatConnexion), 1);
          });
          this.connections.push(chatConnexion);

        });
      });
    });

    this.server.on('error', (error) => {
      console.error('Server error:', error);
    });
  }

  updateStatus(status) {
    for (const connection of this.connections) {
      connection.updateStatus(status);
      this.status = status;
      this.store.set('userPreferences.status', this.status);
      this.showNotification('Spectral', `Votre statut a été mis à jour: ${status}`);
    }
  }

  showNotification(title, body) {
    const notification = new Notification({
      title: title,
      body: body,
    })
  
    notification.show()
  }
}

module.exports = Main;
