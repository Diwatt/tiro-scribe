#!/usr/bin/env node

/**
 * Script to generate db.json for json-server from src/Api/mocks/ JSON files.
 * This ensures we have a single source of truth for mock data.
 */

const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '..', 'src', 'Api', 'mocks');
const outputPath = path.join(__dirname, '..', 'db.json');

function readJsonFile(filename) {
    try {
        const filePath = path.join(mockDataPath, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return null;
    }
}

console.log('Generating db.json from src/Api/mocks/...');

// Read all mock data files
const inferenceModels = readJsonFile('inference-models.json');
const qualifications = readJsonFile('qualifications.json');
const languages = readJsonFile('languages.json');
const therapyMethods = readJsonFile('therapy-methods.json');

// Build the db.json structure
const db = {
    'inference-models': inferenceModels || [],
    'profile-attributes': {
        qualifications: qualifications || [],
        therapyMethods: therapyMethods || [],
        languages: languages || [],
    },
};

// Write to db.json
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));
console.log(`Successfully generated ${outputPath}`);
console.log('Structure:');
console.log(`  - /inference-models (${db['inference-models'].length} models)`);
console.log(`  - /profile-attributes (object with qualifications, therapyMethods, languages)`);
