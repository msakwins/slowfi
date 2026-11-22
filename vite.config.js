import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { isLookupKey } from "./src/lib/catalog.js";
import { lookupDriver } from "./src/lib/driverLookup.js";
import { handleAiRequest } from "./src/lib/aiDriver.js";

// En développement, /api/drivers répond comme la fonction Vercel.
const driversApi = {
  name: "slowfi-drivers-api",
  configureServer(server) {
    server.middlewares.use("/api/drivers", async (req, res) => {
      const id = String(
        new URL(req.url, "http://dev").searchParams.get("id") ?? "",
      ).toUpperCase();
      res.setHeader("Content-Type", "application/json");
      if (!isLookupKey(id)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "id" }));
        return;
      }
      try {
        res.end(JSON.stringify(await lookupDriver(id)));
      } catch {
        res.statusCode = 502;
        res.end(JSON.stringify({ id, error: "catalog" }));
      }
    });
    // Recherche IA : la clé vient de .env.local (GEMINI_API_KEY), jamais
    // envoyée au navigateur.
    const env = loadEnv("development", process.cwd(), "");
    server.middlewares.use("/api/driver-ai", async (req, res) => {
      const query = Object.fromEntries(
        new URL(req.url, "http://dev").searchParams,
      );
      const { status, body } = await handleAiRequest(query, env);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), driversApi],
});
