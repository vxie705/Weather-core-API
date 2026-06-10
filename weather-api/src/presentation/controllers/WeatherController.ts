import { WeatherService } from "../../application/services/WeatherService";

export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  async getWeatherByCity(req: { query: { city?: string } }): Promise<{
    status: number;
    body: unknown;
  }> {
    const city = req.query.city;

    if (!city || city.trim().length === 0) {
      return {
        status: 400,
        body: { error: "El parámetro 'city' es requerido." },
      };
    }

    const weather = await this.weatherService.getWeatherByCity(city);

    if (!weather) {
      return {
        status: 404,
        body: { error: `No se encontró información del clima para '${city}'.` },
      };
    }

    return {
      status: 200,
      body: weather,
    };
  }
}