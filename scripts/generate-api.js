/**
 * Run @hey-api/openapi-ts from its isolated toolchain so generated Types match the API (snake_case).
 * The generator drives the TypeScript compiler API (SyntaxKind, NewLineKind...), which the
 * project-wide typescript@7 no longer ships — the toolchain pins its own TS 6.0.3
 * (see scripts/api-generator/package.json). No key transform; output: src/Api/generated.
 * Run: pnpm generate:api
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOOLCHAIN = path.join(__dirname, 'api-generator');
const SPEC_YAML = path.join(ROOT, 'src/Api/spec.yaml');
const GENERATED = path.join(ROOT, 'src/Api/generated');
const CONFIG = path.join(ROOT, 'openapi-ts.config.mjs');
const OPENAPI_TS_BIN = path.join(TOOLCHAIN, 'node_modules', '.bin', 'openapi-ts');

try {
    if (!fs.existsSync(OPENAPI_TS_BIN)) {
        // --ignore-workspace: the folder sits under the repo workspace; it must resolve
        // its own node_modules (typescript 6) instead of the hoisted workspace root.
        execSync('pnpm install --ignore-workspace', { cwd: TOOLCHAIN, stdio: 'inherit' });
    }

    if (fs.existsSync(GENERATED)) {
        const entries = fs.readdirSync(GENERATED, { withFileTypes: true });
        for (const e of entries) {
            fs.rmSync(path.join(GENERATED, e.name), { recursive: true });
        }
    }

    execSync(`"${OPENAPI_TS_BIN}" -i "${SPEC_YAML}" -f "${CONFIG}"`, { cwd: ROOT, stdio: 'inherit' });

    console.log('Generated API client in src/Api/generated');
} catch (err) {
    process.exitCode = 1;
    throw err;
}
