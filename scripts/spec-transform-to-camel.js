/**
 * Transforms OpenAPI spec (YAML) to camelCase (in memory).
 * Used on-the-fly by generate-api.js so generated types match runtime; no second spec file.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function toCamelCase(str) {
    return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformProperties(properties) {
    if (!properties || typeof properties !== 'object') return properties;
    const out = {};
    for (const [key, value] of Object.entries(properties)) {
        out[toCamelCase(key)] = value;
    }
    return out;
}

function transformSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const next = { ...schema };
    if (next.properties) next.properties = transformProperties(next.properties);
    if (Array.isArray(next.required)) {
        next.required = next.required.map((r) => (typeof r === 'string' ? toCamelCase(r) : r));
    }
    for (const key of ['allOf', 'oneOf', 'anyOf']) {
        if (Array.isArray(next[key])) next[key] = next[key].map(transformSchema);
    }
    if (next.items) next.items = transformSchema(next.items);
    if (next.additionalProperties && typeof next.additionalProperties === 'object') {
        next.additionalProperties = transformSchema(next.additionalProperties);
    }
    return next;
}

function transformSpec(spec) {
    const s = JSON.parse(JSON.stringify(spec));
    if (s.components?.schemas) {
        for (const [name, schema] of Object.entries(s.components.schemas)) {
            s.components.schemas[name] = transformSchema(schema);
        }
    }
    if (s.components?.parameters) {
        for (const p of Object.values(s.components.parameters)) {
            if (p.schema) p.schema = transformSchema(p.schema);
        }
    }
    if (s.components?.requestBodies) {
        for (const body of Object.values(s.components.requestBodies)) {
            if (body.content) {
                for (const content of Object.values(body.content)) {
                    if (content.schema) content.schema = transformSchema(content.schema);
                }
            }
        }
    }
    if (s.components?.responses) {
        for (const res of Object.values(s.components.responses)) {
            if (res.content) {
                for (const content of Object.values(res.content)) {
                    if (content.schema) content.schema = transformSchema(content.schema);
                }
            }
        }
    }
    if (s.paths) {
        for (const pathItem of Object.values(s.paths)) {
            for (const op of Object.values(pathItem)) {
                if (typeof op !== 'object' || !op) continue;
                if (op.parameters) {
                    op.parameters = op.parameters.map((p) =>
                        p.schema ? { ...p, schema: transformSchema(p.schema) } : p,
                    );
                }
                if (op.requestBody?.content) {
                    for (const content of Object.values(op.requestBody.content)) {
                        if (content.schema) content.schema = transformSchema(content.schema);
                    }
                }
                if (op.responses) {
                    for (const res of Object.values(op.responses)) {
                        if (res.content) {
                            for (const content of Object.values(res.content)) {
                                if (content.schema) content.schema = transformSchema(content.schema);
                            }
                        }
                    }
                }
            }
        }
    }
    return s;
}

/**
 * Load spec from path (YAML), transform to camelCase, return JSON object.
 */
function loadAndTransformToCamel(specPath) {
    const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
    return transformSpec(spec);
}

module.exports = { loadAndTransformToCamel };
