const { EventEmitter } = require('events');
const { TextEncoder, TextDecoder } = require('util');
const { DOMParser, XMLSerializer } = require('xmldom');
const crypto = require('crypto');

class ChatConnection extends EventEmitter {

  constructor(main, incoming, outgoing) {
    super();
    this.main = main;
    this.incoming = incoming;
    this.outgoing = outgoing;
    this.lastPresence = null;
    this.connected = true;
  }

  start() {
    this.incomingMessage();
    this.outgoingMessage();
  }

  incomingMessage() {
    console.log('Incoming message');
    try {

      this.incoming.on('data', async (chunk) => {
        const data = new TextDecoder().decode(chunk);

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

  outgoingMessage() {
    console.log('Outgoing message');
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

  async rewriteAndResend(data, status) {
    console.log('Rewriting and resending:', data);
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

  getTextContent(node, selector) {
    const elements = this.selectElements(node, selector);
    return elements.length > 0 ? elements[0].textContent : null;
  }

  setTextContent(node, selector, text) {
    const elements = this.selectElements(node, selector);
    if (elements.length > 0) {
      elements[0].textContent = text;
    }
  }

  removeElement(node, selector) {
    const elements = this.selectElements(node, selector);
    elements.forEach(element => {
      element.parentNode.removeChild(element);
    });
  }

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

  async updateStatus(status) {
    if (!this.lastPresence || !this.connected) return;
    await this.rewriteAndResend(this.lastPresence, status);
  }

}

module.exports = ChatConnection;