const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const users = [];

function findPartner(ws) {
  for (let user of users) {
    if (user !== ws && !user.partner && user.ready) {
      ws.partner = user;
      user.partner = ws;
      ws.send(JSON.stringify({ type: 'match' }));
      user.send(JSON.stringify({ type: 'match' }));
      break;
    }
  }
}

wss.on('connection', (ws) => {
  ws.ready = false;
  users.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'ready') {
        ws.ready = true;
        findPartner(ws);
      }

      if (ws.partner) {
        ws.partner.send(JSON.stringify(data));
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    users.splice(users.indexOf(ws), 1);
    if (ws.partner) {
      ws.partner.partner = null;
      ws.partner.send(JSON.stringify({ type: 'info', message: 'Stranger disconnected.' }));
    }
  });
});

console.log('Server started on ws://localhost:8080');
