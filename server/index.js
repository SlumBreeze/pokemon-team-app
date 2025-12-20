import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "firebase-key.json");
let db;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    // Fix PEM formatting (ensure \n is treated as actual newline)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log("✓ Firebase Admin initialized successfully");
  } else {
    console.warn(
      "⚠️ firebase-key.json not found. Falling back to local file storage."
    );
  }
} catch (error) {
  console.error("❌ Error initializing Firebase:", error);
}

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "data", "profiles.json");

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Load profiles
const loadProfiles = async () => {
  if (db) {
    try {
      const doc = await db.collection("app_data").doc("profiles").get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) {
      console.error("Error loading profiles from Firestore:", e);
    }
  }

  // Fallback to local file
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading profiles from file:", e);
  }
  return null;
};

// Save profiles
const saveProfiles = async (data) => {
  if (db) {
    try {
      await db.collection("app_data").doc("profiles").set(data);
      return true;
    } catch (e) {
      console.error("Error saving profiles to Firestore:", e);
    }
  }

  // Fallback to local file
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error saving profiles to file:", e);
    return false;
  }
};

// GET /api/profiles - Load profiles
app.get("/api/profiles", async (req, res) => {
  const data = await loadProfiles();
  const storageType = db ? "firebase" : "local";

  if (data) {
    res.json({ ...data, storageType });
  } else {
    res.json({ storageType });
  }
});

// POST /api/profiles - Save profiles
app.post("/api/profiles", async (req, res) => {
  const data = req.body;
  if (await saveProfiles(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: "Failed to save" });
  }
});

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// Catch-all route to serve index.html for client-side routing
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api")) {
    return next();
  }

  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Not found");
  }
});

app.listen(PORT, () => {
  console.log(`✓ Profile API server running on http://localhost:${PORT}`);
  console.log(`  Data file: ${DATA_FILE}`);
});
