/**
 * Orval transformer: convert snake_case property names to camelCase in the OpenAPI spec
 * so that generated types and runtime contracts use camelCase (flight-monitor style).
 */

function toCamelCase(str) {
    return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function transformProperties(properties) {
    if (!properties || typeof properties !== 'object') {
        return properties;
    }
    const out = {};
    for (const [key, value] of Object.entries(properties)) {
        out[toCamelCase(key)] = value;
    }
    return out;
}

function transformSchema(schema) {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }
    const next = { ...schema };
    if (next.properties) {
        next.properties = transformProperties(next.properties);
    }
    for (const key of ['allOf', 'oneOf', 'anyOf']) {
        if (Array.isArray(next[key])) {
            next[key] = next[key].map(transformSchema);
        }
    }
    if (next.items) {
        next.items = transformSchema(next.items);
    }
    if (next.additionalProperties && typeof next.additionalProperties === 'object') {
        next.additionalProperties = transformSchema(next.additionalProperties);
    }
    return next;
}

/**
 * @param {object} openApiSpec - Parsed OpenAPI spec (from YAML or JSON)
 * @returns {object} Spec with component schemas and path operation schemas in camelCase
 */
export function transformSnakeToCamelCase(openApiSpec) {
    const spec = JSON.parse(JSON.stringify(openApiSpec));

    if (spec.components?.schemas) {
        for (const [name, schema] of Object.entries(spec.components.schemas)) {
            spec.components.schemas[name] = transformSchema(schema);
        }
    }
    if (spec.components?.parameters) {
        for (const param of Object.values(spec.components.parameters)) {
            if (param.schema) {
                param.schema = transformSchema(param.schema);
            }
        }
    }
    if (spec.components?.requestBodies) {
        for (const body of Object.values(spec.components.requestBodies)) {
            if (body.content) {
                for (const content of Object.values(body.content)) {
                    if (content.schema) {
                        content.schema = transformSchema(content.schema);
                    }
                }
            }
        }
    }
    if (spec.components?.responses) {
        for (const response of Object.values(spec.components.responses)) {
            if (response.content) {
                for (const content of Object.values(response.content)) {
                    if (content.schema) {
                        content.schema = transformSchema(content.schema);
                    }
                }
            }
        }
    }
    if (spec.paths) {
        for (const pathItem of Object.values(spec.paths)) {
            for (const operation of Object.values(pathItem)) {
                if (typeof operation !== 'object' || !operation) {
                    continue;
                }
                if (operation.parameters) {
                    operation.parameters = operation.parameters.map((p) =>
                        p.schema ? { ...p, schema: transformSchema(p.schema) } : p,
                    );
                }
                if (operation.requestBody?.content) {
                    for (const content of Object.values(operation.requestBody.content)) {
                        if (content.schema) {
                            content.schema = transformSchema(content.schema);
                        }
                    }
                }
                if (operation.responses) {
                    for (const response of Object.values(operation.responses)) {
                        if (response.content) {
                            for (const content of Object.values(response.content)) {
                                if (content.schema) {
                                    content.schema = transformSchema(content.schema);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return spec;
}
