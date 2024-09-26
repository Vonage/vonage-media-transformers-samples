const fs   = require('fs');
const packageInfo = require('./package.json');

const currentVersion = packageInfo.dependencies['@vonage/ml-transformers']

if (currentVersion.includes('^') || currentVersion.includes('>') || currentVersion.includes('~')) {
  throw Error('Use exact version for docs: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies')
}

const folderName = '../../docs/ML-Transformers/BackgroundEnchantments/versions/' + currentVersion;
fs.mkdirSync(folderName,  { recursive: true });
fs.cpSync('./dist', folderName, {recursive: true});
fs.cpSync('./media', folderName + '/media', {recursive: true});
fs.cpSync('./public', folderName + '/public', {recursive: true});
