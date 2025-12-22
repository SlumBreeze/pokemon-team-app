/**
 * Restore Script: Upload correct profile data to Firestore
 * 
 * Run this locally with: node server/restore-firestore.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'firebase-key.json');

// The correct caught Pokemon list (113 Pokemon)
const globalCaughtPokemon = [
    "quaxly", "quaxwell", "lechonk", "tarountula", "nymble", "hoppip", "fletchling",
    "fletchinder", "pawmi", "pawmo", "yungoos", "skwovet", "sunkern", "kricketot",
    "scatterbug", "spewpa", "vivillon", "combee", "rookidee", "azurill", "wooper",
    "psyduck", "igglybuff", "jigglypuff", "ralts", "kirlia", "drowzee", "gastly",
    "tandemaus", "pichu", "fidough", "smoliv", "bonsly", "rockruff", "shinx",
    "starly", "oricorio", "mareep", "spoink", "squawkabilly", "phanpy", "nacli",
    "wingull", "magikarp", "arrokuda", "drifloon", "diglett", "mankey", "charcadet",
    "tadbulb", "maschiff", "shroodle", "growlithe", "skiddo", "klawf", "flittle",
    "mudbray", "wiglett", "bombirdier", "shuppet", "gimmighoul", "swablu", "numel",
    "oinkologne", "spidops", "corvisquire", "buizel", "chewtle", "naclstack",
    "deerling", "teddiursa", "murkrow", "komala", "litleo", "tauros", "skiploom",
    "dunsparce", "shellder", "gyarados", "cyclizar", "magnemite", "slowpoke",
    "tinkatink", "flaaffy", "girafarig", "crabrawler", "stunky", "meowth", "donphan",
    "cufant", "bronzor", "wattrel", "bramblin", "cacnea", "silicobra", "larvesta",
    "varoom", "rufflet", "kilowattrel", "finizen", "chansey", "sandygast", "orthworm",
    "meditite", "carkol", "voltorb", "drednaw", "crabominable", "basculin",
    "tinkatuff", "dugtrio", "gogoat", "scovillain"
];

async function restore() {
    // Initialize Firebase
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Error: firebase-key.json not found in server/ directory');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();

    // First, get the existing data to preserve the team
    console.log('📥 Fetching existing Firestore data...');
    const doc = await db.collection('app_data').doc('profiles').get();

    if (!doc.exists) {
        console.error('❌ No existing data in Firestore. Cannot restore team.');
        process.exit(1);
    }

    const existingData = doc.data();
    console.log('   Found existing profiles:', Object.keys(existingData.profiles || {}).length);

    // Update with correct caught Pokemon
    const restoredData = {
        ...existingData,
        globalCaughtPokemon: globalCaughtPokemon
    };

    // Upload to Firestore
    try {
        await db.collection('app_data').doc('profiles').set(restoredData);
        console.log('✅ Successfully restored data to Firestore!');
        console.log(`   - Profiles: ${Object.keys(restoredData.profiles || {}).length}`);
        console.log(`   - Caught Pokemon: ${globalCaughtPokemon.length}`);
    } catch (error) {
        console.error('❌ Error uploading to Firestore:', error);
        process.exit(1);
    }

    process.exit(0);
}

restore();
