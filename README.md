<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Scarlet/Violet Team Analyzer

A Pokemon Scarlet/Violet team builder and matchup analyzer. Build your team, track caught Pokemon, and analyze type effectiveness against gym leaders, Titan Pokemon, and Tera Raids.

## Run Locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Google Cloud Run

**Prerequisites:** [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)

### First-Time Setup

```bash
gcloud auth login
gcloud config set project trainer-hub-481723
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### Deploy / Redeploy

After making changes, run this single command to rebuild and redeploy:

```bash
gcloud run deploy pokemon-team-analyzer --source . --region us-central1 --allow-unauthenticated
```

Your app will be available at the URL provided in the output.

## Tech Stack

- **Frontend:** React, Vite, TailwindCSS
- **Backend:** Express.js, Firebase Admin (Firestore)
- **Deployment:** Docker, Google Cloud Run
