# ADR 001: Uso de Clean Architecture y Patrón Adaptador para la API de Clima

## Estado

Aceptado

## Fecha

2026-06-10

## Contexto

Se requiere diseñar una API de Clima que permita consultar el clima actual de una ciudad, integrando un servicio externo (OpenWeatherMap). La API debe ser:

- **Escalable**: capaz de crecer con nuevas funcionalidades sin rehacer la base.
- **Mantenible**: cambios locales no deben propagarse a todo el sistema.
- **Flexible**: el servicio externo debe poder reemplazarse sin afectar la lógica de negocio.
- **Eficiente**: se debe minimizar el número de llamadas al servicio externo mediante una estrategia de caché.

## Decisión

Se decide implementar la API de Clima utilizando **Clean Architecture** con los siguientes patrones y estrategias:

### 1. Arquitectura en 4 capas

| Capa | Responsabilidad | Dependencias |
|------|----------------|-------------|
| **Dominio** | Entidades (`Weather`), puertos (`WeatherRepository`, `CacheService`), casos de uso (`GetWeatherUseCase`) | Ninguna externa |
| **Aplicación** | Servicios de orquestación (`WeatherService`) | Solo dominio |
| **Infraestructura** | Adaptadores concretos (`OpenWeatherAdapter`, `InMemoryCache`) | Solo dominio (implementan puertos) |
| **Presentación** | Controladores y rutas HTTP (`WeatherController`, `weatherRoutes`) | Solo aplicación |

### 2. Patrón Adaptador

El puerto `WeatherRepository` define el contrato. `OpenWeatherAdapter` implementa ese contrato integrando la API de OpenWeatherMap. Esto permite:

- Reemplazar el proveedor de clima sin modificar el dominio.
- Testear la lógica de negocio con adaptadores mock.

### 3. Estrategia de Caché (Cache-Aside)

```
1. Cliente solicita clima de "Lima"
2. GetWeatherUseCase consulta CacheService.get("weather:city:lima")
3. Si hay datos → retorna de inmediato (cache hit)
4. Si no hay datos → consulta WeatherRepository → almacena en caché (TTL 10 min)
```

Implementada en `GetWeatherUseCase` usando el puerto `CacheService`. La implementación concreta `InMemoryCache` soporta TTL por entrada y limpieza periódica.

### 4. Composición de dependencias (Inyección manual)

Las dependencias se inyectan por constructor, sin contenedor DI externo:

```
InMemoryCache → CacheService
OpenWeatherAdapter → WeatherRepository
GetWeatherUseCase(WeatherRepository, CacheService)
WeatherService(GetWeatherUseCase)
WeatherController(WeatherService)
```

## Justificación

- **Clean Architecture** fue elegida sobre una arquitectura plana (todo en un mismo módulo) porque:
  - Separa claramente las responsabilidades (SRP).
  - Las dependencias apuntan hacia el dominio (DIP).
  - Cada capa puede evolucionar independientemente.

- **El patrón Adaptador** fue elegido sobre acoplar directamente la API externa porque:
  - Permite cambiar de proveedor (ej: WeatherAPI, AccuWeather) sin tocar la lógica de negocio.
  - Facilita tests unitarios con mocks.

- **Cache-Aside** fue elegido sobre otras estrategias (Read-Through, Write-Through) porque:
  - Es la estrategia más simple que cumple el objetivo.
  - La aplicación controla exactamente cuándo se carga la caché.
  - No requiere un proveedor de caché externo (Redis) para funcionar.

- **Inyección manual de dependencias** fue elegida sobre frameworks DI porque:
  - El número de dependencias es pequeño (~5 clases).
  - Evita dependencia de librerías externas en el núcleo.
  - El código de composición es explícito y auditable.

## Consecuencias

### Positivas

- La lógica de negocio (`GetWeatherUseCase`) no depende de HTTP, OpenWeather ni del sistema de caché concreto.
- Cambiar el proveedor de clima requiere solo escribir un nuevo adaptador.
- Cambiar el almacenamiento de caché (ej: de memoria a Redis) requiere solo una nueva implementación de `CacheService`.
- Cada capa puede testearse de forma aislada.

### Negativas

- Mayor número de archivos y directorios comparado con una solución plana.
- Curva de aprendizaje inicial para desarrolladores no familiarizados con Clean Architecture.
- La inyección manual de dependencias puede volverse incómoda si el número de dependencias crece significativamente (>15).

### Neutrales

- Se requiere un archivo de composición raíz (`index.ts`) donde se instancian y conectan todas las dependencias.
- La configuración de la API Key se obtiene de variables de entorno (`OPENWEATHER_API_KEY`).

## Alternativas consideradas

| Alternativa | Razón de descarte |
|------------|-------------------|
| Arquitectura plana (todo en `src/`) | No escala; cambios en API externa afectarían controladores |
| Usar directamente `fetch` en el controlador | Alto acoplamiento; difícil de testear |
| Framework NestJS con decorators | Introduce dependencia pesada para un alcance pequeño |
| Caché solo en el adaptador | La lógica de caché estaría acoplada a OpenWeather; no reusable |

## Referencias

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Cache-Aside Pattern - Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [OpenWeatherMap API Documentation](https://openweathermap.org/api)