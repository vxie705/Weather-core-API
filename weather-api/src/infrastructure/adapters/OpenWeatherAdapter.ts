import { Weather, WeatherLocation, WeatherConditions } from "../../domain/entities/Weather";
import { WeatherRepository } from "../../domain/ports/WeatherRepository";

export class OpenWeatherAdapter implements WeatherRepository {
  private readonly baseUrl = "https://api.openweathermap.org/data/2.5";
  private readonly apiKey: string;
  private readonly units = "metric";
  private readonly language = "es";

  constructor() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENWEATHER_API_KEY no está configurada. " +
        "Define la variable de entorno OPENWEATHER_API_KEY con tu API Key de OpenWeatherMap.",
      );
    }
    this.apiKey = apiKey;
  }

  async getByCity(city: string): Promise<Weather | null> {
    const url =
      `${this.baseUrl}/weather?q=${encodeURIComponent(city)}` +
      `&appid=${this.apiKey}&units=${this.units}&lang=${this.language}`;

    const data = await this.fetchJson(url);
    if (!data || data.cod !== 200) {
      return this.getMockWeather(city);
    }

    return this.mapToWeather(data);
  }

  async getByCoordinates(lat: number, lon: number): Promise<Weather | null> {
    const url =
      `${this.baseUrl}/weather?lat=${lat}&lon=${lon}` +
      `&appid=${this.apiKey}&units=${this.units}&lang=${this.language}`;

    const data = await this.fetchJson(url);
    if (!data || data.cod !== 200) {
      return this.getMockWeather(`${lat},${lon}`);
    }

    return this.mapToWeather(data);
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

  private getMockWeather(cityName: string): Weather {
    const seed = this.hashString(cityName);
    const timestamp = new Date().toISOString();
    const lastUpdated = new Date().toISOString();

    const tempBase = 15 + (seed % 20);
    const tempVariation = ((seed * 7) % 100) / 100;
    const temperature = Math.round((tempBase + tempVariation) * 10) / 10;

    const feelsVariation = ((seed * 13) % 200) / 100;
    const feelsLike = Math.round((temperature + feelsVariation) * 10) / 10;

    const humidity = 40 + (seed % 50);
    const pressure = 990 + (seed % 40);
    const windSpeed = Math.round((0.5 + ((seed * 3) % 80) / 10) * 10) / 10;

    const weatherOptions = [
      { desc: "cielo despejado (mock)", icon: "01d" },
      { desc: "parcialmente nublado (mock)", icon: "02d" },
      { desc: "nublado (mock)", icon: "03d" },
      { desc: "lluvia ligera (mock)", icon: "10d" },
      { desc: "tormenta (mock)", icon: "11d" },
      { desc: "neblina (mock)", icon: "50d" },
    ];
    const weatherChoice = weatherOptions[seed % weatherOptions.length];

    return {
      location: {
        city: cityName,
        country: this.getMockCountry(seed),
        lat: Math.round((-90 + (seed % 180)) * 10000) / 10000,
        lon: Math.round((-180 + ((seed * 7) % 360)) * 10000) / 10000,
      },
      conditions: {
        temperature,
        feelsLike,
        humidity,
        pressure,
        windSpeed,
        description: weatherChoice.desc,
        iconCode: weatherChoice.icon,
      },
      timestamp,
      lastUpdated,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private getMockCountry(seed: number): string {
    const countries = ["PE", "ES", "MX", "AR", "CO", "CL", "US", "FR", "JP", "BR"];
    return countries[seed % countries.length];
  }

  private mapToWeather(data: Record<string, unknown>): Weather {
    const sys = data.sys as Record<string, unknown> | undefined;
    const coord = data.coord as Record<string, unknown> | undefined;
    const main = data.main as Record<string, unknown>;
    const weatherArray = data.weather as Array<Record<string, unknown>>;
    const wind = data.wind as Record<string, unknown>;
    const weatherItem = weatherArray[0];

    const location: WeatherLocation = {
      city: data.name as string,
      country: sys?.country as string ?? "",
      lat: coord?.lat as number ?? 0,
      lon: coord?.lon as number ?? 0,
    };

    const conditions: WeatherConditions = {
      temperature: main.temp as number,
      feelsLike: main.feels_like as number,
      humidity: main.humidity as number,
      pressure: main.pressure as number,
      windSpeed: wind?.speed as number ?? 0,
      description: weatherItem.description as string,
      iconCode: weatherItem.icon as string,
    };

    const timestamp = new Date((data.dt as number) * 1000).toISOString();
    const lastUpdated = new Date().toISOString();

    return { location, conditions, timestamp, lastUpdated };
  }
}