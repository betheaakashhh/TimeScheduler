import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocket } from './socket';

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

console.log('⏳ Booting Next.js...');

app.prepare().then(() => {
  console.log('✅ Next.js ready');

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  console.log('⏳ Attaching Socket.IO...');
  initSocket(httpServer);
  console.log('✅ Socket.IO attached');

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Server running on http://localhost:${PORT}
✅ Next.js  → http://localhost:${PORT}
✅ Socket.IO → ws://localhost:${PORT}
    `);
  });
});