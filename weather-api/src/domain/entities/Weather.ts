
export interface WeatherLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface WeatherConditions {

  temperature: number;

  feelsLike: number;

  humidity: number;

  pressure: number;

  windSpeed: number;

  description: string;

  iconCode: string;
}

export interface Weather {

  location: WeatherLocation;

  conditions: WeatherConditions;

  timestamp: string;

  lastUpdated: string;
}