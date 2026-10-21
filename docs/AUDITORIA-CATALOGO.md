# Auditoría del catálogo

Fecha: 22 de octubre de 2026. Fuentes: README y Releases de los cinco repositorios oficiales proporcionados por SeCaVa. La instantánea de las respuestas relevantes se conserva en `catalog/research.json`.

Se descargaron únicamente ocho parches BPS/UPS, se comprobó cada SHA-256 contra el digest del asset de GitHub y se leyó su cabecera/footer con CRC del parche verificado. Esto verifica metadatos y transporte; **no equivale a probar las traducciones con ROMs reales**. Las pruebas de aplicación usan exclusivamente datos sintéticos.

| Parche | CRC32 original interno | Tamaño original | CRC32 salida interno | CRC32 salida en Release | Decisión |
|---|---|---:|---|---|---|
| Emerald Rogue v1.2 UPS | 1F1C08FB | 16777216 | C04C1ABB | C04C1ABB | Habilitar |
| Emerald Rogue v1.1 UPS | 1F1C08FB | 16777216 | 793E49AC | 607062F1 | Bloquear |
| Ghost Grey v1.4 BPS | DD88761C | 16777216 | 3B30647A | 3B30647A | Habilitar |
| Ghost Grey v1.3 BPS | DD88761C | 16777216 | 8D06BEE3 | 4486BCE4 | Bloquear |
| Mingzhu v1.6 BPS | F1F794DA | 2097152 | 776014AC | 2E295F5B | Bloquear |
| Lazarus v1.8 BPS | 558AE42F | 33554432 | 65C8425C | 65C8425C | Habilitar |
| Lazarus v1.7 BPS | 558AE42F | 33554432 | EA48319C | EA48319C | Habilitar |
| Radical Red v0.1 BPS | FBA55DD8 | 33554432 | 0B932196 | 0B932196 | Habilitar |

Mingzhu: el README sí indica `776014AC`, pero las notas de v1.6 anuncian `2E295F5B` y dicen que el asset fue reemplazado. No se ha elegido silenciosamente uno de los dos resultados. El mantenedor debe confirmar qué binario corresponde a la versión y alinear documentación, digest y parche.

No se han corregido Releases ni README remotos. Para resolver cualquier discrepancia, verificar el binario correcto localmente, actualizar la información oficial y el catálogo y ejecutar de nuevo `npm run build`. Nunca modificar el CRC del parche para forzar su aceptación.

## Fuentes de hashes fuertes

- Emerald USA/Europe: `f3ae088181bf583e55daf962a92bb46f4f1d07b7`, documentado por [pret/pokeemerald](https://github.com/pret/pokeemerald/blob/master/README.md). El CRC de la base proviene de las Releases de [SeCaVa/EmeraldRogue-Castellano](https://github.com/SeCaVa/EmeraldRogue-Castellano/releases).
- FireRed USA 1.0: `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`, documentado por [pret/pokefirered](https://github.com/pret/pokefirered/blob/master/README.md). El CRC y revisión están en [GhostGrey-Traduccion](https://github.com/SeCaVa/GhostGrey-Traduccion/releases).
- Mingzhu original: `1d866a8bcab96c2a957c5ffdc4f4028cbda7827d`, documentado en [el README oficial de la traducción](https://github.com/SeCaVa/Mingzhu-Koudai-Guaishou-2-Pokemon-Digimon-Castellano/blob/main/README.md).
- [Radical Red](https://github.com/SeCaVa/RadicalRed-TraduccionCastellano) y [Lazarus](https://github.com/SeCaVa/PokemonLazarus-Traduccion) requieren el hack inglés ya aplicado. Se localizaron sus bases en las carpetas de trabajo de SeCaVa y se calcularon los siguientes hashes localmente, comprobando tamaño de 33554432 bytes y CRC32 contra las Releases. Solo se incorporan los hashes al catálogo, nunca los archivos.

| Base inglesa | SHA-1 | SHA-256 |
|---|---|---|
| Radical Red 4.1 | `964f951a0fdaf209e4ea1344883ef0d557bb3a80` | `679d112cdfe699c2793d82c7e7999ac9dfca9e222ad5a85d4f8f1e457cd0283f` |
| Lazarus v2 | `7dcdc7e280bc4631487e13dd37e6e0cea04adea6` | `d756b2783dede0bb2c534d1f07713bef733cf53500388e3912f14220a7e16e97` |

Región o revisión desconocida se indica expresamente como no documentada. No se añaden portadas, logos ni sprites ajenos.
