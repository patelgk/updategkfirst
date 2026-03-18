import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import YahooFinance from 'yahoo-finance2';
import admin from 'firebase-admin';
import axios from 'axios';
import fs from 'fs';
import { DhanService } from './dhanService';

const YahooFinanceClass = (YahooFinance as any).default || YahooFinance;
const yf = new YahooFinanceClass();
const dhan = new DhanService();

// Initialize Firebase Admin for Backend
let db: any = null;
try {
  if (fs.existsSync('./firebase-applet-config.json')) {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    // Use the specific database ID from config
    db = admin.firestore(firebaseConfig.firestoreDatabaseId);
    console.log(`[Firebase] Admin SDK initialized for project: ${firebaseConfig.projectId}`);
  } else {
    console.warn('[Firebase] firebase-applet-config.json not found. Admin SDK not initialized.');
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize Admin SDK:', (error as Error).message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    app.use(cors());
    app.use(express.json());
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    const PORT = 3000;
    console.log(`[Server] Starting IndiFunded Server v1.3 (Restored Mode)...`);

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.get("/api/market/quotes", async (req, res) => {
      try {
        if (!settingsLoaded) await updateSettings();
        await fetchMarketData();
        res.json(marketData);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get("/api/market/history/:symbol", async (req, res) => {
      const { symbol } = req.params;
      const yahooSymbol = SYMBOL_MAP[symbol] || symbol;
      
      try {
        const queryOptions = {
          period1: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          interval: '5m' as any,
        };
        const result = await yf.chart(yahooSymbol, queryOptions);
        
        if (result && result.quotes) {
          const candles = result.quotes.map((q: any) => ({
            time: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume
          })).filter((c: any) => c.open != null);
          res.json(candles);
        } else {
          res.status(404).json({ error: "No history found" });
        }
      } catch (error) {
        console.error(`[Market History] Error for ${symbol}:`, (error as Error).message);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // --- Market API State ---
    interface MarketProvider {
      id: string;
      name: string;
      type: 'yahoo' | 'dhan' | 'custom';
      clientId?: string;
      accessToken?: string;
      url?: string;
      headers?: Record<string, string>;
    }

    let marketSettings = {
      activeProviderId: 'yahoo',
      providers: [
        { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' },
        { id: 'dhan', name: 'Dhan API', type: 'dhan', clientId: '', accessToken: '' }
      ] as MarketProvider[]
    };

    // Polling for settings
    let settingsLoaded = false;
    const updateSettings = async () => {
      if (!db) return;
      try {
        const doc = await db.collection('settings').doc('market').get();
        if (doc.exists) {
          const data = doc.data() as any;
          // Support legacy format and migrate
          if (data.marketApiProvider && !data.activeProviderId) {
            marketSettings = {
              activeProviderId: data.marketApiProvider,
              providers: [
                { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' },
                { id: 'dhan', name: 'Dhan API', type: 'dhan', clientId: data.dhanClientId || '', accessToken: data.dhanAccessToken || '' }
              ]
            };
          } else {
            marketSettings = data;
          }

          const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
          if (activeProvider && activeProvider.type === 'dhan') {
            dhan.updateCredentials(activeProvider.clientId || '', activeProvider.accessToken || '');
          }
          settingsLoaded = true;
          console.log(`[Market Feed] Settings updated. Active: ${marketSettings.activeProviderId}`);
        }
      } catch (error) {
        console.error('[Market Feed] Failed to poll settings:', (error as Error).message);
      }
    };

    // Initial fetch and then poll every 30 seconds
    updateSettings();
    setInterval(updateSettings, 30000);

    // --- Trading Engine State ---
    const marketData: Record<string, { price: number, change: number, optionChain: any[] }> = {
      'Nifty 50': { price: 22453.80, change: 102.45, optionChain: [] },
      'Bank Nifty': { price: 47500.00, change: 250.00, optionChain: [] },
      'Fin Nifty': { price: 21000.00, change: 50.00, optionChain: [] },
      'Midcap Nifty': { price: 10500.00, change: 30.00, optionChain: [] },
    };

    const SYMBOL_MAP: Record<string, string> = {
      'Nifty 50': '^NSEI',
      'Bank Nifty': '^NSEBANK',
      'Fin Nifty': 'NIFTY_FIN_SERVICE.NS',
      'Midcap Nifty': '^NSEMDCP50',
    };

    const generateOptionChain = (spotPrice: number, strikeStep: number = 50) => {
      const strikes = [];
      const roundedSpot = Math.round(spotPrice / strikeStep) * strikeStep;
      for (let i = -5; i <= 5; i++) {
        const strike = roundedSpot + (i * strikeStep);
        
        const itm_ce = Math.max(0, spotPrice - strike);
        const itm_pe = Math.max(0, strike - spotPrice);
        const timeValue = Math.max(10, 50 - Math.abs(strike - spotPrice) * 0.1);
        
        const ce_ltp = itm_ce + timeValue + (Math.random() - 0.5) * 2;
        const pe_ltp = itm_pe + timeValue + (Math.random() - 0.5) * 2;
        
        strikes.push({
          strike,
          ce_oi: Math.floor(Math.random() * 200000),
          ce_oi_change: Math.floor((Math.random() - 0.2) * 20000),
          ce_ltp: Number(ce_ltp.toFixed(2)),
          pe_ltp: Number(pe_ltp.toFixed(2)),
          pe_oi_change: Math.floor((Math.random() - 0.2) * 20000),
          pe_oi: Math.floor(Math.random() * 200000),
        });
      }
      return strikes;
    };

    // Real Market Data Fetcher
    let lastFetchTime = 0;
    const fetchMarketData = async (force = false) => {
      // Throttle fetches to once per second to avoid rate limits on serverless
      const now = Date.now();
      if (!force && now - lastFetchTime < 1000) return;
      lastFetchTime = now;

      const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
      
      for (const [displayName, yahooSymbol] of Object.entries(SYMBOL_MAP)) {
        let fetched = false;
        let price = marketData[displayName].price;
        let change = marketData[displayName].change;

        try {
          if (activeProvider?.type === 'dhan' && dhan.isConfigured()) {
            if (displayName === 'Nifty 50') {
              const quote = await dhan.getNiftyQuote();
              if (quote) {
                price = quote.price;
                change = quote.change;
                fetched = true;
              }
            }
          } else if (activeProvider?.type === 'custom' && activeProvider.url) {
            try {
              const response = await axios.get(activeProvider.url, {
                params: { symbol: displayName },
                headers: activeProvider.headers || {}
              });
              if (response.data && response.data.price) {
                price = response.data.price;
                change = response.data.change || 0;
                fetched = true;
              }
            } catch (customErr) {
              console.error(`[Market Feed] Custom API error for ${displayName}:`, (customErr as Error).message);
            }
          }

          if (!fetched) {
            // Fallback to Yahoo Finance
            try {
              const result = await yf.quote(yahooSymbol) as any;
              if (result && result.regularMarketPrice) {
                price = result.regularMarketPrice;
                change = result.regularMarketChange || 0;
                fetched = true;
              }
            } catch (yfErr) {
              // Silent fail for YF, use random walk
            }
          }
        } catch (error) {
          console.error(`[Market Feed] Error for ${displayName}:`, (error as Error).message);
        }

        if (!fetched) {
          const delta = (Math.random() - 0.5) * 2;
          price += delta;
          change += delta;
        }

        const strikeStep = displayName.includes('Bank') ? 100 : 50;
        marketData[displayName] = {
          price,
          change,
          optionChain: generateOptionChain(price, strikeStep)
        };

        io.emit("marketUpdate", {
          symbol: displayName,
          price: marketData[displayName].price,
          change: marketData[displayName].change,
          optionChain: marketData[displayName].optionChain,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false })
        });
      }
    };

    // Fetch real data every 1 second
    setInterval(fetchMarketData, 1000);

    // Vite Middleware for Development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.join(__dirname, "dist")));
      app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', (error as Error).message);
  }
}

startServer();
