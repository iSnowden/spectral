const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const packageJson = require('./package.json');

const version = packageJson.version;
const repo = 'iSnowden/spectral';

// Chemin vers le dossier de build
const outDir = path.join(__dirname, 'dist');

// Créer une archive du code source
const sourceArchive = `spectral-${version}-source.zip`;
execSync(`git archive --format zip -o ${sourceArchive} HEAD`);

// Construire et publier la nouvelle version
execSync('npm run build -- --publish=always');

// Ajouter le code source à la release
execSync(`gh release upload v${version} ${sourceArchive} --repo ${repo} --clobber`);

// Nettoyer l'archive du code source
fs.unlinkSync(sourceArchive);

console.log(`Release v${version} published with source code.`);
