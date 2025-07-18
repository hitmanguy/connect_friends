import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.REDIS_OLD_URL!,
  token: process.env.REDIS_OLD_TOKEN!,
})

await redis.set("foo", "bar");
await redis.get("foo");