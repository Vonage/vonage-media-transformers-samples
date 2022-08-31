# Background Enhancement Sample Application
This sample application shows how to create background enhancement using [@vonage/ml-transformers](https://www.npmjs.com/package/@vonage/ml-transformers) package.
# Demo
You can see a demo of this sample running [here](https://vonage-background-enchantments-sample.s3.amazonaws.com/index.html)
# Building the application
**This is very simple**
## Configure the environment
    nvm install 16.13
    nvm use 16.13
    npm i
## Run dev version

    npm run dev

## Run production version

    npm run build
    npm run preview

# Using it in the "real world"
In our example the result is shown on side canvas.
However, in the real world you want to use it with [OT.Publisher](https://tokbox.com/developer/guides/vonage-media-processor/js/#publisher-setvideomediaprocessorconnector-method)
**That is simple too**
In our *main.ts* you can see this code chunk:
```typescript
...
videoSource_.setMediaProcessorConnector(connector).then(() => {
	console.log('all done and running')
}).catch( e  => {
	console.error(e)
})
...
```
All you need to do is changed it with this code:
```typescript
...
publisher.setVideoMediaProcessorConnector(connector)
...
```