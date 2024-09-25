const ejs = require('ejs');
const fs   = require('fs');
const packageInfo = require('./package.json');

const currentVersion = packageInfo.dependencies['@vonage/ml-transformers']

const folderName = '../../docs/versions/' + currentVersion;
fs.mkdirSync(folderName,  { recursive: true });
fs.cpSync('./dist', folderName, {recursive: true});
fs.cpSync('./media', folderName + '/media', {recursive: true});
fs.cpSync('./public', folderName + '/public', {recursive: true});
