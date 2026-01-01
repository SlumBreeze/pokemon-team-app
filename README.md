<div align="center">

# 🔴 Trainer Hub SV 🟣

### *The Ultimate Team Builder & Matchup Analyzer for Pokémon Scarlet & Violet*

[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

A comprehensive Pokémon Scarlet & Violet companion app for team building, matchup analysis, and Pokédex tracking. Optimize your journey through Paldea with data-driven insights.

## ✨ Key Features

- **Advanced Team Builder**: 
  - Drag-and-drop interface for 6-slot team management.
  - Customize Level, Ability, Tera Type, and Held Items.
  - Automatic hydration of evolution data and base stats.
- **Combat Analysis & Strategy**:
  - Detailed type coverage analysis against 20+ game bosses (Gym Leaders, Team Star, Elite Four).
  - **Auto-Build**: Generate the mathematically optimal team from your caught Pokémon for any specific boss.
- **Interactive Paldea Map**:
  - Browse locations and find exactly where to catch specific Pokémon.
  - High-definition Leaflet-powered map interface.
- **Pokédex & Shiny Tracker**:
  - Track caught and shiny Pokémon to fuel the recommendation engine.
  - Export/Import your progress as JSON.
- **Smart Recommendations**:
  - Context-aware move suggestions based on stats and type coverage.
  - Item recommendations for competitive and casual play.
- **Advanced Persistence & Sync**:
  - **Multi-Profile Support**: Manage multiple playthroughs or competitive teams simultaneously.
  - **Hybrid Storage**: Instant LocalStorage saves with seamless Firestore cloud synchronization.
  - **Offline First**: Work anywhere; data syncs automatically when you're back online.
- **Modern UI/UX**:
  - Responsive design optimized for mobile and desktop.
  - **Dark Mode** support for late-night training sessions.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (Optional, for deployment)

### Run Locally

The app uses a unified development command to run both the Vite frontend and Express backend.

```bash
# Install dependencies
npm install

# Start development environment
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000) (Vite dev server)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

## 💾 Data Persistence

The app employs a robust synchronization engine:

1.  **LocalStorage**: Every change is captured instantly.
2.  **Cloud Sync**: If the server is reachable and configured with Firebase keys, data is persisted to Firestore.
3.  **Conflict Resolution**: Intelligent merging handles discrepancies between local and cloud data, prompting the user when necessary.

**Status Indicators:**
- **☁️ Cloud Synced**: Data is safely stored in the cloud.
- **🔄 Syncing**: Upload in progress.
- **⚠️ Local Only**: Running in offline mode or without a database connection.

## 🛠 Tech Stack

- **Frontend**: 
  - React 19, TypeScript, Vite
  - TailwindCSS (Styling)
  - Lucide React (Icons)
  - Leaflet / React-Leaflet (Mapping)
- **Backend**: 
  - Node.js, Express.js
  - Firebase Admin SDK
- **Infrastructure**: 
  - Docker & Google Cloud Run
  - Firestore (Database)

## ☁️ Deployment

### Containerization
The project includes a `Dockerfile` optimized for production, serving the static frontend and the API from a single Node.js instance.

### Google Cloud Run
```bash
# Build & Push
gcloud builds submit --tag gcr.io/[PROJECT_ID]/trainer-hub

# Deploy
gcloud run deploy trainer-hub --image gcr.io/[PROJECT_ID]/trainer-hub --platform managed --region us-central1 --allow-unauthenticated
```

---
*Note: Pokémon and Pokémon character names are trademarks of Nintendo. Data provided by [PokéAPI](https://pokeapi.co/).*