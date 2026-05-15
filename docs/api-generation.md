# API client generation

The project currently uses **OpenAPI Generator** (`@openapitools/openapi-generator-cli`) with the **typescript-axios** generator. Config lives in `openapitools.json`; the script is `scripts/generate-api.js` (camelCase transform + generator).

## PascalCase filenames (MDC rule)

OpenAPI Generator does **not** support configuring output file names (e.g. PascalCase). Filenames stay kebab-case (`artifact-config.ts`, `tiro-api.ts`). Generated code under `src/Api/generated/` is exempt from the “filename = type name” rule in `.cursor/rules/enterprise-oop.mdc`.

To get **PascalCase filenames at generation time**, use a generator that supports it:

### @hey-api/openapi-ts

**[@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts)** supports `output.fileName.case: 'PascalCase'` so generated files are named at generation, e.g. `ArtifactConfig.ts`, `Tiro.ts`.

Example config (e.g. `openapi-ts.config.js` at project root):

```js
export default {
  input: './src/Api/spec.yaml',
  output: {
    path: 'src/Api/generated',
    fileName: {
      case: 'PascalCase',
      suffix: null,
    },
  },
  types: { name: 'PascalCase' },
  plugins: ['@hey-api/client-axios'],
};
```

- **Input:** Local path or URL; YAML is supported.
- **Axios:** Use plugin `@hey-api/client-axios` and pass your instance via `client.setConfig({ axios: yourInstance })`.
- **Output layout:** Different from typescript-axios (e.g. `client.gen.ts`, `sdk.gen.ts`, `types.gen.ts`). Migrating would require adapting `ApiRegistry`, `ClinicalAttributesClient`, `ModelArtifactClient`, and imports.

Install and run:

```bash
pnpm add -D @hey-api/openapi-ts
pnpm add @hey-api/client-axios
pnpm dlx openapi-ts -c openapi-ts.config.js
```

No post-processing of generated files is required; casing is controlled by the generator config.
