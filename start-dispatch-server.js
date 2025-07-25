#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Dispatch Server...');

// Start the dispatch server
const server = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Handle server process events
server.on('error', (error) => {
  console.error('❌ Failed to start dispatch server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Dispatch server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dispatch server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down dispatch server...');
  server.kill('SIGTERM');
});

console.log('✅ Dispatch server started successfully!');
console.log('📡 Real-time communication enabled on port 4000');
console.log('🔗 Admin and Dispatch can now communicate in real-time'); 