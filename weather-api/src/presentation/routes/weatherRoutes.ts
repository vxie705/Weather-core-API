import { WeatherController } from "../controllers/WeatherController";

export function createWeatherRouter(controller: WeatherController) {
  return {
    async handle(
      method: string,
      url: string,
    ): Promise<{ status: number; body: unknown }> {
      const urlObj = new URL(url, "http://localhost");

      if (method === "GET" && urlObj.pathname === "/weather") {
        const city = urlObj.searchParams.get("city") ?? undefined;
        return controller.getWeatherByCity({ query: { city } });
      }

      return {
        status: 404,
        body: { error: `Ruta no encontrada: ${method} ${urlObj.pathname}` },
      };
    },
  };
}