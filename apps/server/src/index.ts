import { env } from "@burakMulayim/env/server";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
