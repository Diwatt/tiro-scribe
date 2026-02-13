import { defineConfig } from 'orval';

export default defineConfig({
    api: {
        input: {
            target: './src/api/spec.yaml',
        },
        output: {
            mode: 'tags-split',
            target: './src/api/generated',
            schemas: './src/api/generated/models',
            client: 'react-query',
            httpClient: 'fetch',
            mock: {
                type: 'msw',
                delay: 500,
                baseUrl: 'https://api.tiro-scribe.local',
            },
            clean: true,
            format: 'esm',
            override: {
                mutator: {
                    path: './src/api/client.ts',
                    name: 'customInstance',
                },
                query: {
                    useQuery: true,
                    useMutation: true,
                },
            },
        },
    },
});
