import { Weather } from "../../domain/entities/Weather";
import { GetWeatherUseCase } from "../../domain/usecases/GetWeatherUseCase";

export class WeatherService {
  constructor(
    private readonly getWeatherUseCase: GetWeatherUseCase,
  ) {}

  async getWeatherByCity(city: string): Promise<Weather | null> {
    if (!city || city.trim().length === 0) {
      return null;
    }
    return this.getWeatherUseCase.execute(city.trim());
  }
}