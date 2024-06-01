const { EventEmitter } = require('events');
const { TextEncoder, TextDecoder } = require('util');
const { DOMParser, XMLSerializer } = require('xmldom');
const crypto = require('crypto');

class ChatConnection extends EventEmitter {
  /**
   * Constructeur de la classe ChatConnection
   * @param {Object} main - Configuration principale
   * @param {Stream} incoming - Flux de données entrant
   * @param {Stream} outgoing - Flux de données sortant
   */
  constructor(main, incoming, outgoing) {
    super();
    this.main = main;
    this.incoming = incoming;
    this.outgoing = outgoing;
    this.lastPresence = null;
    this.connected = true;
  }

  /**
   * Démarre la connexion de chat en écoutant les messages entrants et sortants
   */
  start() {
    this.incomingMessage();
    this.outgoingMessage();
  }

  /**
   * Gère les messages entrants
   */
  incomingMessage() {
    try {
      this.incoming.on('data', async (chunk) => {
        const data = new TextDecoder().decode(chunk);

        // Vérifie si le message contient une présence et si la fonction est activée
        if (data.includes("<presence") && this.main.enabled) {
          await this.rewriteAndResend(data, this.main.status);
        } else {
          await this.outgoing.write(chunk);
        }
      });

      this.incoming.on('end', () => {
        this.connected = false;
        this.emit('connectionErrored');
      });

      this.incoming.on('error', (e) => {
        this.connected = false;
        this.emit('connectionErrored');
      });

    } catch (error) {
      console.log('Error processing incoming message:', error);
    }
  }

  /**
   * Gère les messages sortants
   */
  outgoingMessage() {
    try {
      this.outgoing.on('data', async (chunk) => {
        const data = new TextDecoder().decode(chunk);
        await this.incoming.write(chunk);
      });

      this.outgoing.on('end', () => {
        this.connected = false;
        this.emit('connectionErrored');
      });

      this.outgoing.on('error', (e) => {
        this.connected = false;
        this.emit('connectionErrored');
      });

    } catch (error) {
      console.log('Error processing outgoing message:', error);
    }
  }

  /**
   * Réécrit et renvoie les données de présence
   * @param {string} data - Les données XML de présence
   * @param {string} status - Le nouveau statut de présence
   */
  async rewriteAndResend(data, status) {
    try {
      this.lastPresence = data;
      const wrappedContent = `<xml>${data}</xml>`;
      const parser = new DOMParser();
      const xml = parser.parseFromString(wrappedContent, "application/xml");

      const presences = Array.from(xml.getElementsByTagName("presence"));

      for (let presence of presences) {
        if (status !== "chat" || this.getTextContent(presence, "games > league_of_legends > st") !== "dnd") {
          this.setTextContent(presence, "show", status);
          this.setTextContent(presence, "games > league_of_legends > st", status);
        }

        if (status == "chat") {
          continue;
        }

        this.removeElement(presence, "status");

        if (status === "mobile") {
          this.removeElement(presence, "games > league_of_legends > p");
          this.removeElement(presence, "games > league_of_legends > m");
        } else {
          this.removeElement(presence, "games > league_of_legends");
        }
      }

      const serializer = new XMLSerializer();
      const xmlString = Array.from(xml.documentElement.childNodes).map(node => serializer.serializeToString(node)).join("");
      const bytes = new TextEncoder().encode(xmlString);
      await this.outgoing.write(bytes);

    } catch (error) {
      console.log('Error rewriting and resending:', error);
    }
  }

  /**
   * Obtient le contenu textuel d'un nœud XML en utilisant un sélecteur
   * @param {Node} node - Le nœud XML de base
   * @param {string} selector - Le sélecteur pour trouver l'élément
   * @returns {string|null} - Le contenu textuel de l'élément sélectionné ou null s'il n'existe pas
   */
  getTextContent(node, selector) {
    const elements = this.selectElements(node, selector);
    return elements.length > 0 ? elements[0].textContent : null;
  }

  /**
   * Définit le contenu textuel d'un nœud XML en utilisant un sélecteur
   * @param {Node} node - Le nœud XML de base
   * @param {string} selector - Le sélecteur pour trouver l'élément
   * @param {string} text - Le texte à définir
   */
  setTextContent(node, selector, text) {
    const elements = this.selectElements(node, selector);
    if (elements.length > 0) {
      elements[0].textContent = text;
    }
  }

  /**
   * Supprime un élément XML en utilisant un sélecteur
   * @param {Node} node - Le nœud XML de base
   * @param {string} selector - Le sélecteur pour trouver l'élément
   */
  removeElement(node, selector) {
    const elements = this.selectElements(node, selector);
    elements.forEach(element => {
      element.parentNode.removeChild(element);
    });
  }

  /**
   * Sélectionne des éléments XML en utilisant un sélecteur complexe
   * @param {Node} node - Le nœud XML de base
   * @param {string} selector - Le sélecteur pour trouver les éléments
   * @returns {Array} - Les éléments sélectionnés
   */
  selectElements(node, selector) {
    const paths = selector.split(' > ');
    let currentNodes = [node];
    for (const path of paths) {
      let newNodes = [];
      currentNodes.forEach(currentNode => {
        const children = currentNode.getElementsByTagName(path);
        newNodes = newNodes.concat(Array.from(children));
      });
      currentNodes = newNodes;
    }
    return currentNodes;
  }

  /**
   * Met à jour le statut de présence
   * @param {string} status - Le nouveau statut de présence
   */
  async updateStatus(status) {
    if (!this.lastPresence || !this.connected) return;
    await this.rewriteAndResend(this.lastPresence, status);
  }
}

module.exports = ChatConnection;
