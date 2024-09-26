const fs   = require('fs');
const packageInfo = require('./package.json');

const currentVersion = packageInfo.dependencies['@vonage/ml-transformers']

const folderName = '../../docs/ML-Transformers/BackgroundEnchantments/versions/' + currentVersion;
fs.mkdirSync(folderName,  { recursive: true });
fs.cpSync('./dist', folderName, {recursive: true});
fs.cpSync('./media', folderName + '/media', {recursive: true});
fs.cpSync('./public', folderName + '/public', {recursive: true});
