/**
 * Drizzle Kit Configuration
 * For schema management and migrations
 */

import {defineConfig} from 'drizzle-kit';

export default defineConfig({
  schema: './src/Database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
