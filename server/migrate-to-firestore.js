/**
 * Migration Script: Upload local profiles.json to Firestore
 * 
 * Run this locally with: node server/migrate-to-firestore.js
 * Requires firebase-key.json to be present in server/ directory
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'firebase-key.json');
const dataFilePath = path.join(__dirname, 'data', 'profiles.json');

async function migrate() {
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

    // Load local data
    if (!fs.existsSync(dataFilePath)) {
        console.error('❌ Error: profiles.json not found in server/data/');
        process.exit(1);
    }

    const localData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    console.log('📁 Loaded local data:');
    console.log(`   - Active Profile ID: ${localData.activeProfileId}`);
    console.log(`   - Profiles: ${Object.keys(localData.profiles || {}).length}`);
    console.log(`   - Caught Pokemon: ${(localData.globalCaughtPokemon || []).length}`);

    // Upload to Firestore
    try {
        await db.collection('app_data').doc('profiles').set(localData);
        console.log('✅ Successfully migrated data to Firestore!');
        console.log('   Document path: app_data/profiles');
    } catch (error) {
        console.error('❌ Error uploading to Firestore:', error);
        process.exit(1);
    }

    process.exit(0);
}

migrate();
