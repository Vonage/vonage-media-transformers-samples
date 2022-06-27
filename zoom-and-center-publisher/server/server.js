const path = require('path')
require("dotenv").config({path: path.resolve(__dirname, '../.env')});

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

const express = require('express');
const cors = require('cors');

const bodyParser = require('body-parser');
const app = express(); // create express app
require('dotenv').config();
app.use(express.static(path.join(__dirname, '../dist')));
app.use(cors());

const OpenTok = require("opentok");
const opentok = new OpenTok(API_KEY, API_SECRET);
app.use(bodyParser.json());

const sessions = {};

app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname+'/index.html'));
  });

app.get('/session/:room', async (req, res) => {
  try {
    const { room: roomName } = req.params;
    console.log(sessions);
    if (sessions[roomName]) {
      const data = generateToken(sessions[roomName]);
      res.json({
        sessionId: sessions[roomName],
        token: data.token,
        apiKey: API_KEY,
      });
    } else {
      const data = await getCredentials();
      sessions[roomName] = data.sessionId;
      res.json({
        sessionId: data.sessionId,
        token: data.token,
        apiKey: API_KEY,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ message: error.message });
  }
});


const createSessionandToken = () => {
    return new Promise((resolve, reject) => {
      opentok.createSession({ mediaMode: 'routed' }, function (error, session) {
        if (error) {
          reject(error);
        } else {
          const sessionId = session.sessionId;
          const token = opentok.generateToken(sessionId);
          resolve({ sessionId: sessionId, token: token });
        }
      });
    });
  };
  
  const generateToken = (sessionId) => {
    const token = opentok.generateToken(sessionId);
    return { token: token };
  };
  
  const getCredentials = async (session = null) => {
    const data = await createSessionandToken(session);
    const sessionId = data.sessionId;
    const token = data.token;
    return { sessionId: sessionId, token: token };
  };
  
const serverPort = process.env.PORT || 5000;
// start express server on port 5000
app.listen(serverPort, () => {
  console.log('server started on port', serverPort);
});