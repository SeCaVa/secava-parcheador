# SeCaVa Traducciones · Parcheador web

Aplicación estática en castellano, con estética de terminal retro y motor real BPS/UPS. Procesa los archivos en un Web Worker del navegador. No sube ROMs, nombres ni hashes, no usa analítica y no enlaza descargas de ROMs comerciales.

[Web en GitHub Pages](https://secava.github.io/secava-parcheador/) · [Código y estado de publicación](https://github.com/SeCaVa/secava-parcheador/actions/workflows/pages.yml)

## Arrancar

Requiere Node.js 24 o superior y npm. Desde esta carpeta:

```sh
npm ci
npm run demo
npm run catalog
npm run dev
```

Abre la URL que imprime Vite. `catalog` descarga **solo parches** de las Releases declaradas y verifica su SHA-256 y cabeceras. La primera preparación necesita conexión; las siguientes reutilizan `.cache/`. La navegación pública no consulta la API de GitHub.

```sh
npm test
npm run build
npm run preview
```

`dist/` es el sitio completo listo para un alojamiento estático HTTPS. **No abras index.html con file://**: los Workers, fetch y WebCrypto necesitan un origen web. Los caminos relativos funcionan en `/nombre-repositorio/` y dominios propios.

## Estado real del catálogo (22 de octubre de 2026)

Se han analizado los cinco repositorios facilitados, sus README, Releases y ocho archivos de parche. Todos los SHA-256 de los parches examinados coinciden con los publicados por GitHub. No se descargó ninguna ROM.

| Proyecto | Versión | Estado |
|---|---|---|
| Emerald Rogue EX | v1.2 | Habilitada. Emerald USA/Europe, CRC32 + SHA-1. |
| Ghost Grey | v1.4 | Habilitada. FireRed USA 1.0, CRC32 + SHA-1. |
| Pocket Mingzhu II | v1.6 | Bloqueada: el CRC de salida del parche difiere de las notas de la Release. |
| Lazarus | v1.8, v1.7 | Pendiente de SHA-1 o SHA-256 de Lazarus v2 en inglés. |
| Radical Red | v0.1 | Pendiente de SHA-1 o SHA-256 de Radical Red 4.1 en inglés. |

También están bloqueadas Ghost Grey v1.3 y Emerald Rogue v1.1 por discrepancias en sus CRC de salida. Los detalles y evidencias están en [docs/AUDITORIA-CATALOGO.md](docs/AUDITORIA-CATALOGO.md). Las fichas pendientes muestran instrucciones reales; no aplican parches ni simulan una integración completa.

La web no puede identificar de forma fiable una ROM ausente de su catálogo. No intenta corregir cabeceras, recortar bytes ni omitir checksums para aceptar una ROM incorrecta.

## Probar sin una ROM

Pulsa «Abrir laboratorio de prueba». Se carga un archivo de 256 bytes inventados, con dos parches reales de demostración (BPS y UPS) y salida verificable. No contiene datos de videojuegos. El laboratorio se identifica expresamente como demostración y sus enlaces ficticios no se usan para descargas.

## Navegadores y pruebas

```sh
npx playwright install chromium firefox webkit
npm run test:browser
```

La suite prueba el sitio compilado con Chrome/Chromium, Firefox y WebKit, más pantallas Pixel 7 e iPhone 13 emuladas. Incluye selección automática/manual, descargas cuyo contenido se compara byte a byte, integridad, errores HTTP, cancelación, ZIP, ROM desconocida y 32 MiB de datos sintéticos. Son pruebas de motor y viewport; no sustituyen ensayos en teléfonos físicos.

En este Windows, Chrome usa la instalación local. Firefox 157 también está probado: como su instalación compartida en AppData fallaba al arrancar, se instala dentro del proyecto con:

```sh
npm run install:firefox
npm run test:browser -- --project=firefox-desktop
```

Playwright selecciona automáticamente esa instalación local de Firefox en Windows, si existe y corresponde a la versión instalada de Playwright. No cambia el navegador predeterminado ni perfiles personales. Después de actualizar Playwright, repite `npm run install:firefox`. En Linux/CI se utilizan los navegadores normales de Playwright. Ver [docs/VERIFICACION.md](docs/VERIFICACION.md) para resultados y límites observados.

## Mantenimiento

- [Añadir versiones, hashes y proyectos](docs/CATALOGO.md).
- [Desplegar en GitHub Pages](docs/DESPLIEGUE.md).
- [Arquitectura, límites y privacidad](docs/ARQUITECTURA.md).
- [Licencias y recursos](docs/LICENCIAS.md).

Para calcular hashes sin enviar el archivo a ningún servicio:

```sh
npm run hash -- "ruta/a/tu/archivo.gba"
```

No subas ese archivo al repositorio. Solo copia los hashes y el tamaño al catálogo.

## Estructura

```text
catalog/projects.json        Fuente de verdad de versiones aprobadas y pendientes
catalog/research.json        Evidencia textual de Releases, no instrucciones ejecutables
src/core/patch.ts            Lector BPS/UPS, límites y CRC internos
src/core/hash.ts             CRC32 y WebCrypto SHA-1/SHA-256
src/core/catalog.ts          Esquema y coincidencia por todos los hashes declarados
src/core/pipeline.ts         Validación común a automático y manual
src/worker.ts                Lectura y aplicación fuera del hilo de interfaz
src/main.ts                 Interfaz y coordinación
scripts/sync-catalog.ts      Verifica y prepara parches para el mismo origen
scripts/check-releases.ts    Detección condicional e importación de manifiestos
tests/                      Datos ficticios y pruebas unitarias/de navegador
.github/workflows/          CI y publicación de Pages
```

El código original de esta aplicación se ofrece bajo MIT. La licencia del programa no concede derechos sobre los parches ni sobre los juegos. El repositorio de la web es [SeCaVa/secava-parcheador](https://github.com/SeCaVa/secava-parcheador).
