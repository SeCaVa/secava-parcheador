# Licencias y recursos

## Aplicación

El código original del parcheador se distribuye bajo la licencia MIT incluida en `LICENSE`. Icono, logotipo tipográfico, cartucho y paneles de la web son dibujos geométricos originales hechos con CSS y SVG. Se usan fuentes de sistema; no se distribuyen fuentes, sprites ni logotipos oficiales de Nintendo/Pokémon.

La marca SeCaVa Traducciones identifica al traductor; el aviso de fans explica la ausencia de afiliación con Nintendo y otros titulares. Los nombres de los juegos se usan para identificar los proyectos.

## Referencias del motor

- [BPS, especificación de byuu](https://floating.muncher.se/byuu/bps/bps_spec.html): declarada de dominio público. Se han revisado varints, acciones, posiciones relativas y footer.
- [RomPatcher.js](https://github.com/marcrobledo/RomPatcher.js): MIT, copyright Marc Robledo. Además de consultar el módulo UPS, se incluyen cuatro módulos sin modificar en `tests/vendor/rompatcher`, con su licencia y commit de origen, como oráculo para pruebas de interoperabilidad. No se incorporan al bundle de producción; el motor de producción de esta aplicación es original.
- [Flips](https://github.com/Alcaro/Flips): proyecto de referencia BPS. No se integra su código GPL en el bundle de producción.

## Dependencias

La única dependencia de producción es Zod (MIT). Vite (MIT), TypeScript (Apache-2.0), tsx (MIT), Vitest (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0, solo tests) y tipos de Node (MIT) son herramientas de desarrollo. Los textos de licencia de las versiones realmente instaladas se conservan dentro de sus paquetes npm; `package-lock.json` fija esas versiones. Las dependencias transitivas conservan sus licencias propias.

## Parches y juegos

Un repositorio público no equivale a una licencia de redistribución. Los README consultados acreditan a los autores, pero no constituyen una autorización universal para reutilizar sus juegos o recursos.

El catálogo registra `redistribution.allowed` y evidencia de la autorización del mantenedor de la traducción para esta integración. **Eso no concede derechos sobre componentes de terceros.** Antes de publicar, SeCaVa debe revisar los permisos de los autores originales y el contenido de los parches que incorporan el hack completo. No se han declarado esos juegos MIT ni se han redistribuido ROMs comerciales.

Si no se autoriza alojar un parche junto al sitio, retirar su versión del array `releases` y conservar una ficha con instrucciones. No añadir proxies o métodos para eludir restricciones de distribución.
