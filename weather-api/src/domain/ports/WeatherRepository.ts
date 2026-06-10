import { Weather } from "../entities/Weather";

export interface WeatherRepository {
  getByCity(city: string): Promise<Weather | null>;
  getByCoordinates(lat: number, lon: number): Promise<Weather | null>;
}