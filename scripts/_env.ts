import { loadEnvConfig } from "@next/env";

// Load .env, .env.local etc. exactly like Next.js does.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
