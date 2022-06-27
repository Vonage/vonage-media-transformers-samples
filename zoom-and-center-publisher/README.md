# Zoom and Center publisher
 
## Introduction
This application show you how to integrate Vonage Video API with [@vonage/ml-transformers](https://www.npmjs.com/package/@vonage/ml-transformers) and [@vonage/media-processor](https://www.npmjs.com/package/@vonage/media-processor) packages.
The app will adjust the publisher stream automatically based on publisher's face:  
  1. Zoom publisher.  
  2. Center publisher.  
  3. Brighten up if the stream is too dark.  

## Environment Variables
You need to setup some environment variables 

  - `PORT` -- this variable works only for manual deployment. Heroku deployment will automatically fill the value.
  - `API_KEY` -- your Vonage Video API - API Key
  - `API_SECRET` -- your Vonage Video API - API Secret

## Deployment
You can directly click below `Deploy to Heroku` button to deploy the app.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nexmo-se/zoom-and-center-publisher)


## Manual deployment
This section is for manual deployment. 
  - Clone and navigate inside this repository.
  - Run `yarn install` or `npm install`
  - Rename `.env.example` to `.env` and fill in the environment variable.
  - Run `yarn build` or `npm run build`
  - Run `yarn start` or `npm run start`
  - Open your web browser. For example `http://localhost:5000`

The local deployment has been done. You can use various technology such as `ngrok` or `nginx` to make it public. Furthermore, for this demo to run smoothly in public, you need `https` or `SSL`. 

`ngrok` will automatically grant you `SSL` certificate. However, if `nginx` was choose as public deployment, you can use `Let's Encrypt` to get your free `SSL` certificate.
