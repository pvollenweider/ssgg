import { LocalStorage } from './local.js';

export { LocalStorage };

/**
 * Create a storage adapter based on environment variables.
 * STORAGE_DRIVER=local (default) | s3
 */
export function createStorage(env = process.env) {
  const driver = env.STORAGE_DRIVER || 'local';
  if (driver === 'local') {
    return new LocalStorage(env.STORAGE_ROOT || process.cwd());
  }
  throw new Error(`Storage driver "${driver}" not yet implemented`);
}
