# 🚀 Crypto EMA Scanner Dashboard

A cyberpunk-styled web dashboard for running and visualizing crypto EMA50 scanner results.

## ✨ Features

- 🎨 **Cyberpunk Aesthetic** - Neon colors, scanlines, grid backgrounds
- 📊 **Real-time Scanning** - Live progress tracking
- 🔥 **Three Strategic Lists** - LONG TERM, TRADE NOW, AVOID
- ⚡ **Demo Mode** - Test without API calls
- 💾 **Result Caching** - Load previous scans
- 📱 **Responsive** - Works on all devices

## 🚀 Quick Start

### 1. Start the API Server

```bash
# From the project root
python api_server.py
```

The API will start on `http://localhost:5000`

### 2. Start the Dashboard

```bash
# In crypto-scanner-dashboard directory
npm run dev
```

The dashboard will start on `http://localhost:5173`

### 3. Open Browser

Navigate to `http://localhost:5173` and click **"DEMO MODE"** to test!

## 🎮 Usage

### Demo Mode (Recommended First)
1. Click **"DEMO MODE"** button
2. See simulated results instantly
3. Explore the three tabs

### Real Scan
1. Set **TOP COINS** (5-200)
2. Click **"RUN SCAN"**
3. Watch progress in real-time

## 🎨 Cyberpunk Design

- **Fonts**: Orbitron (display), Share Tech Mono (mono)
- **Colors**: Neon cyan, pink, purple, green
- **Effects**: Scanlines, grid, glows, animations

## 📡 API Endpoints

- `GET /api/status` - Scan status
- `POST /api/scan` - Start scan
- `GET /api/demo` - Demo data
- `GET /api/results/latest` - Latest results

## 🐛 Troubleshooting

- **"Failed to start scan"** → Check API server is running
- **"No scan data"** → Click "DEMO MODE" first
- **CORS errors** → Ensure Flask-CORS installed

---

**Built with 💙 for crypto traders**# emascanner
