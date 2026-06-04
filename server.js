const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients
let viewer = null;
let sender = null;

wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Register role
      if (data.type === 'register') {
        if (data.role === 'viewer') {
          viewer = ws;
          console.log('Viewer connected');
          ws.send(JSON.stringify({ type: 'registered', role: 'viewer' }));
          // Notify sender if already connected
          if (sender) {
            sender.send(JSON.stringify({ type: 'viewer_connected' }));
          }
        } else if (data.role === 'sender') {
          sender = ws;
          console.log('Sender connected');
          ws.send(JSON.stringify({ type: 'registered', role: 'sender' }));
          // Notify viewer
          if (viewer && viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'sender_connected' }));
          }
        }
        return;
      }

      // Relay data from sender to viewer
      if (viewer && viewer.readyState === WebSocket.OPEN) {
        viewer.send(JSON.stringify(data));
      }

    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (ws === viewer) {
      viewer = null;
      console.log('Viewer disconnected');
    }
    if (ws === sender) {
      sender = null;
      console.log('Sender disconnected');
      if (viewer && viewer.readyState === WebSocket.OPEN) {
        viewer.send(JSON.stringify({ type: 'sender_disconnected' }));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`PhoneView server running on port ${PORT}`);
});
