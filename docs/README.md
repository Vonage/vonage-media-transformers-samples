# Vonage Media Transformers Github Pages

A github pages folder to host the BackgroundEnchantments demo

## About

This folder hosts an index and a versions folder of the background effects using different versions of the @vonage/ml-transformers library.

Structure:

- `index.html` - redirects to the latest version
- `versions/index.html` - a list of version links
- `versions/<version>/index.html` - the index page for the demo from [../ML-Transformers/BackgroundEnchantments](../ML-Transformers/BackgroundEnchantments).

This project uses Node and EJS to create the index pages based on the directories found in the versions folder.

## Build

To update this page:

- Update the version of `@vonage/ml-transformers` in the `package.json` of BackgroundEnchantments [here](../ML-Transformers/BackgroundEnchantments/package.json)
- in the BackgroundEnchantments directory run `npm run buildToDocs` to build the project and copy the dist over to a new version folder in this docs folder.
- in this (docs) directory run `npm i` then `npm run build-pages`. The will generate the updated `index.html` and `versions/index.html` with the new versions found in `./versions`
