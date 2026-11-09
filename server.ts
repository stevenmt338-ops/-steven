import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Rolling 7-day window and maximum 3 wishes per rolling window
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WISHES_PER_WINDOW = 3;

export interface WishRecord {
  id: string;
  visitorHash: string; // SHA-256 hash of visitor ID and fingerprint
  visitorId: string;   // Anonymous client-generated UUID
  text: string;
  isPublic: boolean;
  createdAt: number;   // Server-side epoch timestamp
  position: [number, number, number]; // 3D coordinates in the celestial dome
  brightness: number;
  size: number;
}

interface DatabaseSchema {
  wishes: WishRecord[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'wishes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache + file sync with atomic writing
let dbState: DatabaseSchema = { wishes: [] };

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.wishes)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load database file, starting clean:', err);
  }
  return { wishes: [] };
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to atomically write database file:', err);
  }
}

dbState = loadDatabase();

// Generate deterministic celestial position for each star
function generateCelestialPosition(seedStr: string, index: number): [number, number, number] {
  const hash = crypto.createHash('sha256').update(seedStr + ':' + index).digest('hex');
  const h1 = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  const h2 = parseInt(hash.substring(8, 16), 16) / 0xffffffff;
  const h3 = parseInt(hash.substring(16, 24), 16) / 0xffffffff;

  // Distribute across upper celestial hemisphere visible above the snowy mountains
  // Azimuth: full 360 deg or concentrated towards the magical mountain valley (azimuth -120 to +120 deg)
  const azimuth = (h1 - 0.5) * Math.PI * 1.5; // span across the sky
  const elevation = 0.25 + h2 * 0.55; // from above mountain ridgeline to near zenith
  const distance = 160 + h3 * 90; // distance in 3D world units

  const x = Math.sin(azimuth) * Math.cos(elevation) * distance;
  const y = Math.sin(elevation) * distance + 10; // elevated in sky
  const z = -Math.cos(azimuth) * Math.cos(elevation) * distance;

  return [parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2)), parseFloat(z.toFixed(2))];
}

// Compute client fingerprint hash
function getVisitorHash(req: Request, clientVisitorId?: string): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'unknown';
  const vid = clientVisitorId || (req.headers['x-visitor-id'] as string) || '';
  return crypto.createHash('sha256').update(`${vid}:${ip}:${ua}`).digest('hex');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Get status & 7-day countdown for current visitor
  // 1. Get status & 7-day countdown for current visitor (3 wishes per rolling 7 days)
  app.get('/api/status', (req: Request, res: Response) => {
    const clientVisitorId = (req.query.visitorId as string) || (req.headers['x-visitor-id'] as string) || '';
    const visitorHash = getVisitorHash(req, clientVisitorId);

    // Find all wishes submitted by this visitor
    const visitorWishes = dbState.wishes.filter(
      (w) => (clientVisitorId && w.visitorId === clientVisitorId) || w.visitorHash === visitorHash
    );

    visitorWishes.sort((a, b) => b.createdAt - a.createdAt);
    const lastWish = visitorWishes[0] || null;

    const now = Date.now();
    // Wishes in the rolling 7-day window
    const recentWishes = visitorWishes.filter((w) => now - w.createdAt < SEVEN_DAYS_MS);
    // Sort oldest first to determine when the earliest slot frees up
    recentWishes.sort((a, b) => a.createdAt - b.createdAt);

    const usedSlots = recentWishes.length;
    const remainingSlots = Math.max(0, MAX_WISHES_PER_WINDOW - usedSlots);
    const canSubmit = remainingSlots > 0;

    let remainingMs = 0;
    let nextEligibleTime = now;
    if (!canSubmit && recentWishes.length > 0) {
      const oldestOfWindow = recentWishes[0];
      remainingMs = Math.max(0, SEVEN_DAYS_MS - (now - oldestOfWindow.createdAt));
      nextEligibleTime = oldestOfWindow.createdAt + SEVEN_DAYS_MS;
    }

    res.json({
      canSubmit,
      remainingSlots,
      usedSlots,
      maxSlots: MAX_WISHES_PER_WINDOW,
      remainingMs,
      nextEligibleTime,
      totalWishes: dbState.wishes.length,
      lastWish: lastWish
        ? {
            id: lastWish.id,
            text: lastWish.text,
            createdAt: lastWish.createdAt,
            isPublic: lastWish.isPublic,
            position: lastWish.position,
          }
        : null,
      myWishes: visitorWishes.map((w) => ({
        id: w.id,
        text: w.text,
        createdAt: w.createdAt,
        isPublic: w.isPublic,
        position: w.position,
      })),
    });
  });

  // 2. Submit a new wish (Server-enforced 3-wishes-per-7-days rule & atomic write)
  app.post('/api/submit-wish', (req: Request, res: Response) => {
    const { text, isPublic, visitorId } = req.body;

    if (!visitorId || typeof visitorId !== 'string' || visitorId.trim().length < 10) {
      res.status(400).json({ error: 'Valid anonymous visitor identity required' });
      return;
    }

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Wish text is required' });
      return;
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      res.status(400).json({ error: 'Wish cannot be empty or whitespace only' });
      return;
    }

    if (trimmedText.length > 300) {
      res.status(400).json({ error: 'Wish must not exceed 300 characters' });
      return;
    }

    const visitorHash = getVisitorHash(req, visitorId);
    const now = Date.now();

    // Check for submissions within the rolling 7 days
    const recentWishes = dbState.wishes.filter(
      (w) =>
        (w.visitorId === visitorId || w.visitorHash === visitorHash) &&
        now - w.createdAt < SEVEN_DAYS_MS
    );

    if (recentWishes.length >= MAX_WISHES_PER_WINDOW) {
      recentWishes.sort((a, b) => a.createdAt - b.createdAt);
      const oldestOfWindow = recentWishes[0];
      const remainingMs = Math.max(0, SEVEN_DAYS_MS - (now - oldestOfWindow.createdAt));
      res.status(429).json({
        error: 'Each visitor may submit up to three wishes every seven days.',
        remainingMs,
        nextEligibleTime: oldestOfWindow.createdAt + SEVEN_DAYS_MS,
        remainingSlots: 0,
        usedSlots: recentWishes.length,
      });
      return;
    }

    const wishId = crypto.randomUUID();
    const position = generateCelestialPosition(wishId, dbState.wishes.length);

    const newWish: WishRecord = {
      id: wishId,
      visitorId,
      visitorHash,
      text: trimmedText,
      isPublic: Boolean(isPublic),
      createdAt: now,
      position,
      brightness: 1.0 + Math.random() * 0.3,
      size: 1.0 + Math.random() * 0.4,
    };

    dbState.wishes.push(newWish);
    saveDatabase(dbState);

    res.json({
      success: true,
      wish: {
        id: newWish.id,
        text: newWish.text,
        createdAt: newWish.createdAt,
        isPublic: newWish.isPublic,
        position: newWish.position,
        brightness: newWish.brightness,
        size: newWish.size,
      },
      remainingSlots: Math.max(0, MAX_WISHES_PER_WINDOW - (recentWishes.length + 1)),
      usedSlots: recentWishes.length + 1,
      maxSlots: MAX_WISHES_PER_WINDOW,
      totalWishes: dbState.wishes.length,
    });
  });

  // 3. Get all constellation stars (Privacy protected: private wishes do NOT leak text)
  app.get('/api/wishes', (req: Request, res: Response) => {
    const clientVisitorId = (req.query.visitorId as string) || (req.headers['x-visitor-id'] as string) || '';

    // Transform wishes: only include text if isPublic is true OR if requested by the creator
    const stars = dbState.wishes.map((w) => {
      const isOwner = clientVisitorId && w.visitorId === clientVisitorId;
      return {
        id: w.id,
        position: w.position,
        brightness: w.brightness,
        size: w.size,
        createdAt: w.createdAt,
        isPublic: w.isPublic,
        isOwner: Boolean(isOwner),
        text: w.isPublic || isOwner ? w.text : null,
      };
    });

    res.json({
      stars,
      totalWishes: dbState.wishes.length,
    });
  });

  // 4. Vite middleware or static serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THE LAST WISH] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
