import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

let loaded = false;

export function loadEnv() {
  if (loaded) return;

  const envCandidates = [join(__dirname, '..', '.env')];

  for (const path of envCandidates) {
    if (existsSync(path)) {
      config({ path, override: false });
    }
  }

  loaded = true;
}

export function validateRequiredEnv(keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
