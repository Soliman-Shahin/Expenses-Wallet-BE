// Generate secure secrets for .env file
const crypto = require('crypto');

console.log('\n=== Generated Secure Secrets ===\n');
console.log('Copy these to your .env file:\n');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('ACCESS_TOKEN_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('REFRESH_TOKEN_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('SECRET_KEY=' + crypto.randomBytes(64).toString('hex'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('\n================================\n');
