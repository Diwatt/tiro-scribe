/**
 * Run @hey-api/openapi-ts from the raw spec so generated Types match the API (snake_case).
 * No key transform; output: src/Api/generated (PascalCase filenames from config).
 * Run: node scripts/generate-api.js or pnpm run generate:api
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPEC_YAML = path.join(ROOT, 'src/Api/spec.yaml');
const GENERATED = path.join(ROOT, 'src/Api/generated');
const CONFIG = path.join(ROOT, 'openapi-ts.config.mjs');

try {
    if (fs.existsSync(GENERATED)) {
        const entries = fs.readdirSync(GENERATED, { withFileTypes: true });
        for (const e of entries) {
            fs.rmSync(path.join(GENERATED, e.name), { recursive: true });
        }
    }

    execSync(
        `npx openapi-ts -i "${SPEC_YAML}" -f "${CONFIG}"`,
        { cwd: ROOT, stdio: 'inherit' },
    );

    console.log('Generated API client in src/Api/generated');
} catch (err) {
    process.exitCode = 1;
    throw err;
}
