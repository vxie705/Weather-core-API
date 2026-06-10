import { Weather, WeatherLocation, WeatherConditions } from "../../domain/entities/Weather";
import { WeatherRepository } from "../../domain/ports/WeatherRepository";

export class OpenMeteoAdapter implements WeatherRepository {
  private readonly geocodingBaseUrl = "https://geocoding-api.open-meteo.com/v1";
  private readonly weatherBaseUrl = "https://api.open-meteo.com/v1";

  async getByCity(city: string): Promise<Weather | null> {
    const geoUrl = `${this.geocodingBaseUrl}/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;

    const geoData = await this.fetchJson(geoUrl);
    if (!geoData || !geoData.results || !Array.isArray(geoData.results) || geoData.results.length === 0) {
      return null;
    }

    const result = geoData.results[0] as Record<string, unknown>;
    const lat = result.latitude as number;
    const lon = result.longitude as number;
    const cityName = (result.name as string) || city;
    const country = (result.country_code as string) || "";

    return this.getByCoordinates(lat, lon, cityName, country);
  }

  async getByCoordinates(
    lat: number,
    lon: number,
    cityNameOverride?: string,
    countryOverride?: string,
  ): Promise<Weather | null> {
    const weatherUrl =
      `${this.weatherBaseUrl}/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&timezone=auto`;

    const data = await this.fetchJson(weatherUrl);
    if (!data) {
      return null;
    }

    const currentWeather = data.current_weather as Record<string, unknown>;
    if (!currentWeather) {
      return null;
    }

    return this.mapToWeather(data, lat, lon, cityNameOverride, countryOverride);
  }

  private async fetchJson(url: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private mapToWeather(
    data: Record<string, unknown>,
    lat: number,
    lon: number,
    cityNameOverride?: string,
    countryOverride?: string,
  ): Weather {
    const currentWeather = data.current_weather as Record<string, unknown>;
    const weatherCode = currentWeather.weathercode as number;

    const conditions = this.decodeWeatherCode(weatherCode);

    const location: WeatherLocation = {
      city: cityNameOverride || `${lat.toFixed(2)},${lon.toFixed(2)}`,
      country: countryOverride || this.getCountryFromTimezone(data),
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
    };

    const weatherConditions: WeatherConditions = {
      temperature: currentWeather.temperature as number,
      feelsLike: Math.round(((currentWeather.temperature as number) - ((currentWeather.windspeed as number) * 0.3)) * 10) / 10,
      humidity: this.estimateHumidity(weatherCode),
      pressure: 1013,
      windSpeed: currentWeather.windspeed as number,
      description: conditions.description,
      iconCode: conditions.iconCode,
    };

    const timestamp = (currentWeather.time as string) || new Date().toISOString();
    const lastUpdated = new Date().toISOString();

    return { location, conditions: weatherConditions, timestamp, lastUpdated };
  }

  private decodeWeatherCode(code: number): { description: string; iconCode: string } {
    if (code === 0) return { description: "cielo despejado", iconCode: "01d" };
    if (code === 1) return { description: "mayormente despejado", iconCode: "01d" };
    if (code === 2) return { description: "parcialmente nublado", iconCode: "02d" };
    if (code === 3) return { description: "nublado", iconCode: "04d" };
    if (code >= 45 && code <= 48) return { description: "neblina", iconCode: "50d" };
    if (code >= 51 && code <= 55) return { description: "llovizna ligera", iconCode: "09d" };
    if (code >= 56 && code <= 57) return { description: "llovizna helada", iconCode: "09d" };
    if (code >= 61 && code <= 63) return { description: "lluvia", iconCode: "10d" };
    if (code >= 64 && code <= 65) return { description: "lluvia intensa", iconCode: "10d" };
    if (code >= 66 && code <= 67) return { description: "lluvia helada", iconCode: "10d" };
    if (code >= 71 && code <= 75) return { description: "nieve", iconCode: "13d" };
    if (code === 77) return { description: "granizo", iconCode: "13d" };
    if (code >= 80 && code <= 82) return { description: "chubascos", iconCode: "10d" };
    if (code >= 85 && code <= 86) return { description: "chubascos de nieve", iconCode: "13d" };
    if (code === 95) return { description: "tormenta", iconCode: "11d" };
    if (code >= 96 && code <= 99) return { description: "tormenta con granizo", iconCode: "11d" };
    return { description: "desconocido", iconCode: "03d" };
  }

  private getCountryFromTimezone(data: Record<string, unknown>): string {
    const tz = data.timezone as string | undefined;
    if (tz) {
      const parts = tz.split("/");
      if (parts.length >= 1 && parts[0].length === 2) {
        return parts[0].toUpperCase();
      }
    }
    return "";
  }

  private estimateHumidity(code: number): number {
    if (code === 0 || code === 1) return 40;
    if (code === 2) return 55;
    if (code === 3 || code === 4) return 70;
    if (code >= 45 && code <= 48) return 85;
    if (code >= 51 && code <= 67) return 80;
    if (code >= 71 && code <= 77) return 75;
    if (code >= 80 && code <= 82) return 85;
    if (code >= 95) return 90;
    return 60;
  }
}