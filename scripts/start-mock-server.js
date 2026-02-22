#!/usr/bin/env node

/**
 * Start mock server with port conflict handling
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');
const DB_JSON = path.join(ROOT, 'db.json');
const MOCKS_DIR = path.join(ROOT, 'src/Api/mocks');

const DEFAULT_PORT = 3000;
const ALTERNATE_PORTS = [3001, 3002, 3003];

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
            resolve(false);
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

async function findAvailablePort(startPort = DEFAULT_PORT) {
    let port = startPort;
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
        if (await isPortAvailable(port)) {
            return port;
        }
        console.log(`Port ${port} is already in use, trying ${port + 1}...`);
        port++;
    }

    throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

function generateDbJson() {
    console.log('Generating db.json from src/Api/mocks/...');

    try {
        // Read mock files
        const inferenceModels = JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, 'inference-models.json'), 'utf8'));
        const qualifications = JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, 'qualifications.json'), 'utf8'));
        const therapyMethods = JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, 'therapy-methods.json'), 'utf8'));
        const languages = JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, 'languages.json'), 'utf8'));

        // Create db.json structure
        const db = {
            'inference-models': inferenceModels,
            'profile-attributes': {
                qualifications,
                therapyMethods,
                languages,
            },
        };

        // Write db.json
        fs.writeFileSync(DB_JSON, JSON.stringify(db, null, 2));

        console.log(`Successfully generated ${DB_JSON}`);
        console.log('Structure:');
        console.log(`  - /inference-models (${inferenceModels.length} models)`);
        console.log('  - /profile-attributes (object with qualifications, therapyMethods, languages)');

        return true;
    } catch (error) {
        console.error('Error generating db.json:', error.message);
        return false;
    }
}

async function startJsonServer(port) {
    console.log(`Starting json-server on port ${port}...`);

    const server = spawn('npx', ['json-server', '--watch', 'db.json', '--port', port.toString(), '--host', '0.0.0.0'], {
        stdio: 'inherit',
        shell: true,
    });

    server.on('error', (error) => {
        console.error('Failed to start json-server:', error.message);
        process.exit(1);
    });

    server.on('exit', (code) => {
        console.log(`json-server exited with code ${code}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nShutting down json-server...');
        server.kill('SIGINT');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        server.kill('SIGTERM');
    });

    return server;
}

async function main() {
    try {
        // Generate db.json first
        if (!generateDbJson()) {
            process.exit(1);
        }

        // Find available port
        const port = await findAvailablePort(DEFAULT_PORT);

        if (port !== DEFAULT_PORT) {
            console.log(`\nNote: Using port ${port} instead of ${DEFAULT_PORT} (port ${DEFAULT_PORT} is in use)`);
            console.log(`Access the mock server at: http://localhost:${port}`);
        } else {
            console.log(`\nMock server running at: http://localhost:${port}`);
        }

        console.log('Available endpoints:');
        console.log(`  GET http://localhost:${port}/inference-models`);
        console.log(`  GET http://localhost:${port}/profile-attributes`);
        console.log('\nPress Ctrl+C to stop the server\n');

        // Start json-server
        await startJsonServer(port);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
