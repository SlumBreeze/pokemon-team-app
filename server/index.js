import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'profiles.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Load profiles from file
const loadProfiles = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading profiles:', e);
    }
    return null;
};

// Save profiles to file
const saveProfiles = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving profiles:', e);
        return false;
    }
};

// GET /api/profiles - Load profiles
app.get('/api/profiles', (req, res) => {
    const data = loadProfiles();
    if (data) {
        res.json(data);
    } else {
        res.json({});
    }
});

// POST /api/profiles - Save profiles
app.post('/api/profiles', (req, res) => {
    const data = req.body;
    if (saveProfiles(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Failed to save' });
    }
});

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Catch-all route to serve index.html for client-side routing
app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
        return next();
    }

    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log(`✓ Profile API server running on http://localhost:${PORT}`);
    console.log(`  Data file: ${DATA_FILE}`);
});
