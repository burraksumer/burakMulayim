import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
