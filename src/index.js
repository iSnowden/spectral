// Importation des modules nécessaires
const { app } = require('electron');
const Main = require('./Main');

// Déclaration de la variable 'main' pour stocker l'instance principale de l'application
let main = null;

// Événement déclenché lorsque l'application est prête
app.on('ready', async () => {
  // Création de l'instance de l'application principale
  main = new Main();
  
  // Initialisation de l'application principale
  await main.init();
});
