import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client with singleton pattern
export const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST || 'redis-11072.c74.us-east-1-4.ec2.redns.redis-cloud.com',
        port: parseInt(process.env.REDIS_PORT || '11072')
    }
});

redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('disconnect', () => console.log('Disconnected from Redis'));

// Auto-connect when module is imported
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing Redis connection...');
    try {
        await redisClient.quit();
    } catch (error) {
        console.error('Error closing Redis connection:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Closing Redis connection...');
    try {
        await redisClient.quit();
    } catch (error) {
        console.error('Error closing Redis connection:', error);
    }
    process.exit(0);
});