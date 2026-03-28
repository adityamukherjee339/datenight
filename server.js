const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', (roomCode) => {
      socket.join(roomCode);
      console.log(`Socket ${socket.id} joined room: ${roomCode}`);
      socket.to(roomCode).emit('user-joined', socket.id);
    });

    socket.on('video-command', (data) => {
      // expecting data: { action: 'play'|'pause'|'seek', time: number, roomId: string }
      socket.to(data.roomId).emit('receive-video-command', data);
    });

    socket.on('interaction', (data) => {
      // expecting data: { type: 'nudge'|'reaction', payload: any, roomId: string }
      socket.to(data.roomId).emit('receive-interaction', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
