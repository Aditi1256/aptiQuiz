import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import questionSetsRouter from './routes/questionSets.js';
import roomsRouter from './routes/rooms.js';
import collegesRouter from './routes/colleges.js';
import analyticsRouter from './routes/analytics.js';
import leagueRouter from './routes/league.js';
import aiRouter from './routes/ai.js';
import { registerRoomHandlers } from './socket/roomHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS configuration supporting localhost and 127.0.0.1
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Routes
app.use('/api/question-sets', questionSetsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/colleges', collegesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/league', leagueRouter);
app.use('/api/ai', aiRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../../client/dist');

// Production: Serve React client build if dist folder exists
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Local development root status page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>AptiQuiz Server Online</title>
          <style>
            body { background: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f172a; border: 1px solid #334155; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
            h1 { color: #818cf8; margin: 1rem 0 0.5rem 0; font-size: 1.8rem; }
            .badge { background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 0.35rem 0.85rem; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.4rem; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin: 1rem 0 1.5rem 0; }
            .btn { background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; padding: 0.85rem 1.5rem; border-radius: 0.85rem; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
            .btn:hover { opacity: 0.95; }
            .links { display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; border-top: 1px solid #1e293b; pt: 1rem; padding-top: 1.2rem; }
            a.link { color: #38bdf8; text-decoration: none; font-size: 0.85rem; }
            a.link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">● Server Active & Online</div>
            <h1>AptiQuiz Backend (Port 5000)</h1>
            <p>Express REST API & Socket.io WebSockets are running smoothly and connected to Neon PostgreSQL.</p>
            <a href="http://localhost:5173" class="btn">Open AptiQuiz App (Port 5173) &rarr;</a>
            <div class="links">
              <a class="link" href="/api/health">/api/health</a>
              <a class="link" href="/api/question-sets">/api/question-sets</a>
              <a class="link" href="/api/league/standings">/api/league/standings</a>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AptiQuiz Server',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Socket.io initialization with flexible CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Real-time Socket Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] New client connected: ${socket.id}`);

  // Test ping/pong event to measure round-trip latency
  socket.on('client_ping', (data, callback) => {
    const serverTimestamp = Date.now();
    if (typeof callback === 'function') {
      callback({
        serverTimestamp,
        receivedData: data
      });
    } else {
      socket.emit('server_pong', {
        serverTimestamp,
        receivedData: data
      });
    }
  });

  // Register Lobby and Room WebSocket Event Handlers
  registerRoomHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
  });
});

// Export io and server for future modular controllers
export { app, server, io };

// Start HTTP + Socket.io Server if run directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 AptiQuiz Server listening on port ${PORT}`);
    console.log(`📡 WebSocket ready at ws://localhost:${PORT}`);
  });
}
