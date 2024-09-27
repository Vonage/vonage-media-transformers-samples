const fs   = require('fs');
const packageInfo = require('./package.json');

const mlTransformersDependencyVersion = packageInfo.dependencies['@vonage/ml-transformers']
const demoVersion = packageInfo.version;

if (mlTransformersDependencyVersion.includes('^') || mlTransformersDependencyVersion.includes('>') || mlTransformersDependencyVersion.includes('~')) {
  throw Error('Use exact version for docs: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies')
}

if (demoVersion !== mlTransformersDependencyVersion) {
  throw Error('Update the package.json version to match the @vonage/ml-transformers version')
}

const folderName = '../../docs/ML-Transformers/BackgroundEnchantments/versions/' + mlTransformersDependencyVersion;
fs.mkdirSync(folderName,  { recursive: true });
fs.cpSync('./dist', folderName, {recursive: true});
fs.cpSync('./media', folderName + '/media', {recursive: true});
fs.cpSync('./public', folderName + '/public', {recursive: true});
