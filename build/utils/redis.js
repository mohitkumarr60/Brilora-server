"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
require("dotenv").config();
let redis;
try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error("Environment variable REDIS_URL is not set.");
    }
    redis = new ioredis_1.Redis(redisUrl);
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
}
catch (error) {
    console.error("Failed to initialize Redis:", error.message);
    process.exit(1); // Exit the application on critical failure
}
exports.default = redis;
