import { Weather } from "../entities/Weather";
import { WeatherRepository } from "../ports/WeatherRepository";
import { CacheService } from "../ports/CacheService";

export class GetWeatherUseCase {
  private static readonly CACHE_TTL_SECONDS = 600;

  constructor(
    private readonly weatherRepository: WeatherRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(city: string): Promise<Weather | null> {
    const cacheKey = this.buildCacheKey(city);

    const cached = await this.cacheService.get<Weather>(cacheKey);
    if (cached) {
      return cached;
    }

    const weather = await this.weatherRepository.getByCity(city);
    if (!weather) {
      return null;
    }

    await this.cacheService.set(
      cacheKey,
      weather,
      GetWeatherUseCase.CACHE_TTL_SECONDS,
    );

    return weather;
  }

  private buildCacheKey(city: string): string {
    return `weather:city:${city.trim().toLowerCase()}`;
  }
}