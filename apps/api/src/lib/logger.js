// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/lib/logger.js
//
// Singleton pino logger. JSON in production, pretty-printed in development.
// Use everywhere instead of console.log/console.error.
//
// Usage:
//   import { logger } from '../lib/logger.js';
//   logger.info({ upload_id, gallery_id, file_size }, 'upload finished');
//   logger.error({ err }, 'upload failed');

import pino from 'pino';

const isDev = (process.env.NODE_ENV || 'development') === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev ? {
    transport: {
      target:  'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  } : {
    // Production: JSON to stdout, structured for log aggregators
    formatters: {
      level: label => ({ level: label }),
    },
    base: {
      service: 'gallerypack-api',
      env:     process.env.NODE_ENV || 'production',
      version: process.env.APP_VERSION || '0.0.1',
    },
  }),
});

// Child loggers for subsystems — add subsystem field automatically
export const uploadLogger   = logger.child({ subsystem: 'upload' });
export const thumbLogger    = logger.child({ subsystem: 'thumbnail' });
export const prerenderLogger = logger.child({ subsystem: 'prerender' });
export const dbLogger       = logger.child({ subsystem: 'db' });
export const authLogger     = logger.child({ subsystem: 'auth' });
