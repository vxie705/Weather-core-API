import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { OpenMeteoAdapter } from "./infrastructure/adapters/OpenMeteoAdapter";
import { InMemoryCache } from "./infrastructure/cache/InMemoryCache";
import { GetWeatherUseCase } from "./domain/usecases/GetWeatherUseCase";
import { WeatherService } from "./application/services/WeatherService";
import { WeatherController } from "./presentation/controllers/WeatherController";
import { createWeatherRouter } from "./presentation/routes/weatherRoutes";

const cache = new InMemoryCache();
const weatherAdapter = new OpenMeteoAdapter();
const getWeatherUseCase = new GetWeatherUseCase(weatherAdapter, cache);
const weatherService = new WeatherService(getWeatherUseCase);
const weatherController = new WeatherController(weatherService);
const router = createWeatherRouter(weatherController);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

function serveStaticFile(url: string, res: http.ServerResponse): void {
  let filePath = path.join(PUBLIC_DIR, url === "/" ? "index.html" : url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Archivo no encontrado");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": Buffer.byteLength(data),
    });
    res.end(data);
  });
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = http.createServer(
  async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    try {
      const urlObj = new URL(url, "http://localhost");
      if (method === "GET" && urlObj.pathname === "/weather") {
        const { status, body } = await router.handle(method, url);
        const json = JSON.stringify(body);
        res.writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(json),
        });
        res.end(json);
        return;
      }

      serveStaticFile(url, res);
    } catch (error) {
      console.error("Error no controlado:", error);
      const body = JSON.stringify({ error: "Error interno del servidor" });
      res.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
    }
  },
);

server.listen(PORT, HOST, () => {
  console.log(`API de Clima ejecutándose en http://${HOST}:${PORT}`);
  console.log(`   Página: http://localhost:${PORT}/`);
  console.log(`   API:    http://localhost:${PORT}/weather?city=Lima`);
});

function gracefulShutdown() {
  console.log("\nCerrando servidor...");
  server.close(() => {
    cache.destroy();
    console.log("Servidor cerrado.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Cierre forzado tras timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);