const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 12655,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

redisClient.on('connect', () => console.log('✅ Connected to Redis Cloud'));
redisClient.on('ready', () => console.log('🚀 Redis ready for commands'));
redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
redisClient.on('end', () => console.log('🔌 Redis connection closed'));

module.exports = redisClient;


