const ejs = require('ejs');
const fs   = require('fs');
const packageInfo = require('../ML-Transformers/BackgroundEnchantments/package.json');

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

// The list of versions is just the list of directories in the versions directory
const versions = getDirectories('./versions');

var versionListTemplate = fs.readFileSync('./version_list_template.ejs', 'utf-8');
var versionListHtml  = ejs.render( versionListTemplate , {versions});
fs.writeFileSync("./versions/index.html", versionListHtml, 'utf8');

// Get the current version from package.json. This is the version we will redirect to at the root index
const currentVersion = packageInfo.dependencies['@vonage/ml-transformers']
var redirectTemplate = fs.readFileSync('./redirect_template.ejs', 'utf-8');
var redirectHtml  = ejs.render( redirectTemplate , {version: currentVersion});
fs.writeFileSync("./index.html", redirectHtml, 'utf8');
