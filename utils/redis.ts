import { Redis } from "ioredis";
require("dotenv").config();

let redis: Redis;

try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error("Environment variable REDIS_URL is not set.");
    }

    redis = new Redis(redisUrl);

    // Optional: Add event listeners for better debugging
    redis.on("connect", () => {
        console.log("Redis connected successfully.");
    });

    redis.on("error", (err) => {
        console.error("Redis connection error:", err.message);
    });

    redis.on("close", () => {
        console.warn("Redis connection closed.");
    });

} catch (error: any) {
    console.error("Failed to initialize Redis:", error.message);
    process.exit(1); // Exit the application on critical failure
}

export default redis;
