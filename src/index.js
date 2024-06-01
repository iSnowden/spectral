const { app } = require('electron');
const Main = require('./Main');

let main = null;

app.on('ready', async () => {
  
  main = new Main();
  await main.init();

});
