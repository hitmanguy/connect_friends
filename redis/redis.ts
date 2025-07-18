import { createClient } from 'redis';

const redis = createClient({
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST!,
        port: Number(process.env.REDIS_PORT!)
    }
});

redis.on('error', err => console.log('Redis Client Error', err));

if (!redis.isOpen) {
    await redis.connect();
}

export default redis;

