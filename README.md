<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Scarlet/Violet Team Analyzer

A powerful Pokemon Scarlet/Violet team builder and matchup analyzer. Build your team, track caught Pokemon, and analyze type effectiveness against gym leaders, Titan Pokemon, and Tera Raids.

## ✨ Key Features

- **Team Builder**: Drag-and-drop interface to build your perfect team of 6.
- **Combat Analysis**: See your team's coverage and weaknesses against specific game bosses.
- **Pokedex Tracker**: Keep track of caught Pokemon to power the "Auto-Build" feature.
- **Robust Persistence**: Data is saved instantly to your device and synced to the cloud when online.
- **Mobile Friendly**: Fully responsive design for use on phones and tablets.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (Optional, for deployment)

### Run Locally

The app runs a backend server (for API/Database) and a frontend client concurrently.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 💾 Data Persistence

This app uses a hybrid storage system to ensure you never lose data:

1.  **LocalStorage (Offline)**: All changes are saved instantly to your browser. You can work completely offline!
2.  **Cloud Sync (Online)**: If a database connection is available, data syncs to Firestore.

**Status Indicators:**

- **[OFFLINE]**: Server is unreachable. Saving to device only.
- **[LOCAL SERVER]**: Connected to server, but server is using temporary file storage (no Database keys found).
- **(Hidden)**: Fully connected to Cloud Database.

## ☁️ Deployment (Google Cloud Run)

This project is optimized for containerized deployment on Google Cloud Run.

### 1. Setup Project

```bash
gcloud auth login
gcloud config set project trainer-hub-481723
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 2. Deploy

Run the following single command to build and deploy the container:

```bash
gcloud run deploy trainer-hub --source . --region us-central1 --allow-unauthenticated
```

_Note: To enable Cloud Database sync, ensure `firebase-key.json` is present in the container or mounted as a secret._

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons
- **Backend**: Express.js, Node.js
- **Database**: Firestore (via Firebase Admin SDK) + Local File Fallback
- **Infrastructure**: Docker, Google Cloud Run
