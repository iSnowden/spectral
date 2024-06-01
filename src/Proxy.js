const { EventEmitter } = require('events');
const http = require('http');
const { dialog } = require('electron');

class Proxy extends EventEmitter {
  constructor(lolChat) {
    super();
    this.lolChat = lolChat;
    this.clientConfigUrl = 'https://clientconfig.rpg.riotgames.com';
    this.riotGeo = 'https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat';
    this.proxyPort = 0;
    this.server = null;
    this.chatPort = 0; // Assuming this is set somewhere else or needs to be passed
    this.riotChatHost = null;
    this.riotChatPort = 0;
  }

  async initialize() {
    this.server = http.createServer(async (req, res) => {
      await this.modifyClientConfig(req, res);
    }).listen(0);

    this.proxyPort = this.server.address().port;
    console.log(`Proxy listening on port ${this.proxyPort}`);
  }

  async modifyClientConfig(req, res) {
    const fetch = (await import('node-fetch')).default;
    const requestUrl = new URL(this.clientConfigUrl + req.url);
    const options = this.buildRequestOptions(req);

    try {
      const clientResponse = await fetch(requestUrl.href, options);
      let content = await clientResponse.text();
      let updatedContent = content;

      if (!clientResponse.ok) {
        this.sendResponse(res, clientResponse, updatedContent);
        return;
      }

      updatedContent = await this.updateConfigContent(content, req);

      this.sendResponse(res, clientResponse, updatedContent);
    } catch (error) {
      console.log('Error modifying client config:', error);
      this.errorMessage();
    }
  }

  buildRequestOptions(req) {
    return {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'],
        'X-Riot-Entitlements-JWT': req.headers['x-riot-entitlements-jwt'],
        'Authorization': req.headers['authorization']
      }
    };
  }

  async updateConfigContent(content, req) {
    let config = JSON.parse(content);

    if (config['chat.host']) {
      this.riotChatHost = config['chat.host'];
      config['chat.host'] = '127.0.0.1';
    }

    if (config['chat.port']) {
      this.riotChatPort = config['chat.port'];
      config['chat.port'] = this.lolChat;
    }

    if (config['chat.affinities']) {
      await this.updateChatAffinities(config, req);
    }

    if (config['chat.allow_bad_cert.enabled'] === false) {
      config['chat.allow_bad_cert.enabled'] = true;
    }

    const updatedContent = JSON.stringify(config);

    if (this.riotChatHost && this.riotChatPort !== 0) {
      this.emit('updatedConfig', { riotChatHost: this.riotChatHost, riotChatPort: this.riotChatPort });
    }

    return updatedContent;
  }

  async updateChatAffinities(config, req) {
    const affinities = config['chat.affinities'];

    if (config['chat.affinity.enabled']) {
      const affinityHost = await this.getAffinityHost(req);
      if (affinityHost) {
        this.riotChatHost = affinities[affinityHost];
      }
    }

    for (const key in affinities) {
      if (affinities.hasOwnProperty(key)) {
        affinities[key] = '127.0.0.1';
      }
    }
  }

  async getAffinityHost(req) {
    const fetch = (await import('node-fetch')).default;
    const option = {
      method: 'GET',
      headers: {
        'Authorization': req.headers['authorization']
      }
    };

    const response = await fetch(this.riotGeo, option);
    const jwt = await response.text();
    const payload = jwt.split('.')[1];
    const base64 = payload.padEnd(payload.length + (4 - (payload.length % 4)), '=');
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

    return json.affinity ? json.affinity : null;
  }

  sendResponse(res, clientResponse, updatedContent) {
    res.statusCode = clientResponse.status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(updatedContent));
    res.end(updatedContent);
  }

  handleNotFound(res) {
    res.writeHead(404);
    res.end();
  }

  errorMessage() {
    dialog.showMessageBoxSync({
      type: 'error',
      buttons: ['OK'],
      title: 'Spectral',
      message: 'Une erreur est survenue lors de la modification de la configuration du client.'
    });
  }
}

module.exports = Proxy;
