// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/sharpProcess.js
//
// Spawns a fresh Node.js child process for every Sharp operation.
// If libvips crashes with SIGBUS (exit code 135 = 128+7), the child dies —
// the main API process is completely unaffected.
//
// Usage:
//   const meta = await runSharp({ op: 'metadata', srcPath });
//   await runSharp({ op: 'resize-webp', srcPath, destPath, width, height, fit, quality });

import { spawn }       from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WORKER_PATH = fileURLToPath(new URL('./sharpWorker.js', import.meta.url));
const TIMEOUT_MS  = 120_000; // 2 min max per image

/**
 * Run a Sharp operation in an isolated child process.
 * Throws if the child crashes, times out, or reports an error.
 *
 * @param {object} msg  { op, ...params }
 * @returns {Promise<any>}
 */
export function runSharp(msg) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ['pipe', 'pipe', 'inherit'], // stdin writable, stdout readable, stderr to parent
    });

    let stdout  = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new Error(`Sharp worker timed out after ${TIMEOUT_MS / 1000}s`));
      }
    }, TIMEOUT_MS);

    // Write job as JSON to child's stdin, then close it so the child sees EOF
    child.stdin.write(JSON.stringify(msg));
    child.stdin.end();

    child.stdout.on('data', (chunk) => { stdout += chunk; });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (signal) {
        // SIGBUS = signal 7, exit code 135 (128+7) when reported as code
        return reject(new Error(
          `Sharp worker killed by signal ${signal} — likely libvips SIGBUS on corrupt image`
        ));
      }

      // Try to parse stdout as JSON
      let reply;
      try {
        reply = JSON.parse(stdout);
      } catch {
        return reject(new Error(
          `Sharp worker exited with code ${code} and non-JSON output: ${stdout.slice(0, 200)}`
        ));
      }

      if (reply.ok) {
        resolve(reply.result);
      } else {
        reject(new Error(reply.error || 'Sharp worker reported failure'));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`Failed to spawn Sharp worker: ${err.message}`));
      }
    });
  });
}
