# WebSocket Server Setup for Real-time Collaboration

To enable real-time collaborative editing, you'll need to set up a WebSocket server. Here are a few options:

## Option 1: Simple Node.js WebSocket Server

Create a file `websocket-server.js` in your project root:

```javascript
const WebSocket = require('ws')
const http = require('http')
const wss = require('y-websocket/bin/utils')

const server = http.createServer()
wss.setupWSConnection(server, '/')

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
```

Install dependencies:
```bash
npm install ws y-websocket
```

Run the server:
```bash
node websocket-server.js
```

## Option 2: Using y-websocket-server

```bash
npm install -g y-websocket-server
y-websocket-server --port 1234
```

## Option 3: Docker Setup

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  websocket:
    image: yjs/y-websocket-server
    ports:
      - "1234:1234"
    environment:
      - PORT=1234
```

## Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

## Enabling Collaboration in the Editor

Once you have a WebSocket server running, uncomment the collaboration imports in `CollaborativeEditor.tsx` and update the editor configuration to include the collaboration extensions.

## Production Deployment

For production, consider using:
- **Railway** - Easy deployment for Node.js apps
- **Heroku** - Simple deployment with add-ons
- **AWS** - More complex but scalable
- **DigitalOcean** - Cost-effective VPS option

## Alternative: Supabase Realtime

You can also use Supabase's built-in realtime features instead of a separate WebSocket server, though it requires more setup with Yjs integration.
