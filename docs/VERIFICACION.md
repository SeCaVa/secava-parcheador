# Verificación de la entrega

Entorno: Windows, Node.js 24.19.0. Fecha local: 22 de octubre de 2026. Las pruebas no usan ROMs comerciales.

## Comprobaciones realizadas

- `npm run typecheck`: correcto.
- `npm test`: **88 pruebas correctas** en cinco archivos.
- `npm run build`: correcto. Genera el catálogo validado, dos parches oficiales habilitados y el bundle estático en `dist/`.
- Playwright: **85 pruebas correctas** entre los cinco perfiles: 68 en la validación de Chrome/WebKit (escritorio y pantallas móviles emuladas), más 17 en la validación posterior de Firefox 157 de escritorio. Incluyen los modos de desarrollo y producción.
- Axe: sin infracciones detectadas de las reglas WCAG 2 A/AA y 2.1 A/AA seleccionadas para la pantalla inicial y una ficha. Esto es una comprobación automatizada parcial, no una certificación completa de accesibilidad.
- Diseño: capturas de escritorio y móvil inspeccionadas; sin desbordamiento horizontal.
- Sitio servido bajo `/secava-parcheador/`: Worker, catálogo, archivo ficticio, parche UPS y validación final funcionan bajo ese prefijo en los cinco perfiles disponibles.
- Descarga real del resultado BPS/UPS: comparada byte a byte con el resultado esperado de los fixtures.
- Privacidad: durante los flujos de prueba las peticiones son GET del mismo origen y no tienen cuerpo; no se transmiten nombres, hashes ni contenido de ROMs.
- Ocho parches oficiales: SHA-256 del asset y CRC del parche verificados; cabeceras/footer contrastados con los datos publicados. Véase AUDITORIA-CATALOGO.md.
- `npm run check:releases`: consultas de solo lectura a los cinco repositorios completadas; informa de Releases sin manifiesto en lugar de habilitarlas por ser recientes.

## Cobertura del motor

BPS: SourceRead, TargetRead, SourceCopy, TargetCopy, offsets negativos válidos e inválidos, repeticiones solapadas, metadatos y varints de varios bytes. UPS: XOR, salto de un byte tras el terminador, ampliación y reducción con ceros virtuales. Ambos: tamaño/CRC del original, CRC del parche y del resultado, formato, truncamientos, corrupción, límites de asignación y tamaño declarado.

Se incluyen vectores SHA conocidos, CRC32 contrastado con `node:zlib`, 120 casos generativos deterministas y comparación contra RomPatcher.js MIT fijado por commit. Este motor independiente aplica nuestros parches de prueba; el nuestro aplica sus BPS lineales/delta y UPS. El código de referencia solo está en `tests/vendor`, no en producción.

El pipeline completo comprueba además el SHA-256 y tamaño del parche descargado y hashes de salida declarados. La identificación comprueba todos los hashes registrados, sin nombres de archivo, y admite varias bases explícitas por versión. La suite de red cubre 404, 429, 500, desconexión, límite de tamaño y cancelación.

## Límites pendientes

**Fallo inicial de Firefox resuelto con una instalación local.** La copia compartida bajo AppData devolvía «la configuración en paralelo no es correcta» y `spawn UNKNOWN`; el registro SideBySide de Windows señalaba el ensamblado `mozglue`. Reinstalar en esa misma ubicación no resolvió el error. La misma distribución oficial, instalada bajo `.cache/playwright` dentro del proyecto, sí arrancó y superó las 17 pruebas. Esto localiza el problema en el contexto de instalación/arranque de aquella ruta; no demuestra una ausencia del runtime de Visual C++.

`npm run install:firefox` reproduce la instalación local. La configuración de Playwright la usa en Windows cuando su revisión coincide con la del paquete instalado; Linux/CI conserva la selección predeterminada. No se modificaron ejecutables, se retiraron la copia y el manifiesto temporales de diagnóstico y no se cambiaron el navegador predeterminado ni perfiles personales. `npm run typecheck` también pasó después del ajuste. El workflow remoto de Ubuntu todavía no se ha ejecutado.

No se han probado dispositivos móviles físicos ni jugado ROMs reales. Se ha procesado un archivo inventado de 32 MiB en cada perfil; eso no garantiza funcionamiento con el máximo de 64 MiB en cualquier teléfono. El límite de tamaño se comprueba antes de leer el archivo, y en el motor antes de asignar la salida.

La importación automática se ha probado unitariamente con manifiestos sintéticos y contrastado su consulta real a GitHub. Los repositorios examinados todavía no publican `secava-release.json`; no se afirma haber importado una Release nueva real por esa vía.

La validación remota y el despliegue de cada commit se registran en [GitHub Actions](https://github.com/SeCaVa/secava-parcheador/actions/workflows/pages.yml). Las cifras anteriores documentan la validación local; consulta la ejecución del commit publicado para comprobar también el resultado de Ubuntu y GitHub Pages.

La tarea delegada a ClinePass fue una propuesta de casos de prueba. Kimi K3 devolvió 429 por cuota mensual agotada, sin generar un borrador; no se incorporó contenido suyo. Los tests fueron escritos y verificados localmente.

## Reproducir

```sh
npm ci
npm run demo
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
```

En este Windows, ejecuta `npm run install:firefox` antes de las pruebas para preparar la ruta local verificada. Para comprobar únicamente Firefox: `npm run test:browser -- --project=firefox-desktop`.
