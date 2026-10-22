# Auditoría del catálogo

Fecha: 22 de octubre de 2026. Fuentes: README y Releases de los cinco repositorios oficiales proporcionados por SeCaVa. La instantánea de las respuestas relevantes se conserva en `catalog/research.json`.

Se descargaron únicamente ocho parches BPS/UPS, se comprobó cada SHA-256 contra el digest del asset de GitHub y se leyó su cabecera/footer con CRC del parche verificado. Esto verifica metadatos y transporte; **no equivale a probar las traducciones con ROMs reales**. Las pruebas de aplicación usan exclusivamente datos sintéticos.

| Parche | CRC32 original interno | Tamaño original | CRC32 salida interno | CRC32 salida en Release | Decisión |
|---|---|---:|---|---|---|
| Emerald Rogue v0.3 UPS | 1F1C08FB | 16777216 | C04C1ABB | C04C1ABB | Habilitar |
| Emerald Rogue v0.2 UPS | 1F1C08FB | 16777216 | 793E49AC | 607062F1 | Bloquear |
| Ghost Grey v0.5 BPS | DD88761C | 16777216 | 3B30647A | 3B30647A | Habilitar |
| Ghost Grey v0.4 BPS | DD88761C | 16777216 | 8D06BEE3 | 4486BCE4 | Bloquear |
| Mingzhu v0.7 BPS | F1F794DA | 2097152 | 776014AC | 2E295F5B (anterior) | Habilitar: contrastado localmente |
| Lazarus v0.9 BPS | 558AE42F | 33554432 | 65C8425C | 65C8425C | Habilitar |
| Lazarus v0.8 BPS | 558AE42F | 33554432 | EA48319C | EA48319C | Habilitar |
| Radical Red v0.1 BPS | FBA55DD8 | 33554432 | 0B932196 | 0B932196 | Habilitar |

Mingzhu: discrepancia resuelta el 22 de octubre de 2026 al comprobar los archivos locales de SeCaVa. El original de 2097152 bytes tiene CRC32 `F1F794DA`; el resultado final de 4194304 bytes tiene CRC32 `776014AC`, coincidente con el README y el footer del parche publicado. El BPS local final coincide en tamaño y SHA-256 con el asset de v0.7: 333205 bytes y `00e4410c7a99d0705e952970cf172e56b042e68d7c4be8136336809b5f86d348`. Se localizó además un BPS anterior de 331863 bytes cuyo footer declara `2E295F5B`: las notas de la Release conservan ese CRC anterior. El catálogo habilita el parche publicado con los hashes del resultado final; no se ha modificado el parche.

No se han corregido Releases ni README remotos. Para resolver cualquier discrepancia, verificar el binario correcto localmente, actualizar la información oficial y el catálogo y ejecutar de nuevo `npm run build`. Nunca modificar el CRC del parche para forzar su aceptación.

## Fuentes de hashes fuertes

- Emerald USA/Europe: `f3ae088181bf583e55daf962a92bb46f4f1d07b7`, documentado por [pret/pokeemerald](https://github.com/pret/pokeemerald/blob/master/README.md). El CRC de la base proviene de las Releases de [SeCaVa/EmeraldRogue-Castellano](https://github.com/SeCaVa/EmeraldRogue-Castellano/releases).
- FireRed USA 1.0: `41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc`, documentado por [pret/pokefirered](https://github.com/pret/pokefirered/blob/master/README.md). El CRC y revisión están en [GhostGrey-Traduccion](https://github.com/SeCaVa/GhostGrey-Traduccion/releases).
- Mingzhu original: `1d866a8bcab96c2a957c5ffdc4f4028cbda7827d`, documentado en [el README oficial de la traducción](https://github.com/SeCaVa/Mingzhu-Koudai-Guaishou-2-Pokemon-Digimon-Castellano/blob/main/README.md).
- Mingzhu, contraste local del 22 de octubre de 2026: SHA-256 del original `f994455124219e68c97da20a88e636cd79dc6c49f2f12cb7606c83365b34ce02`. Resultado final: SHA-1 `a270ddfcb364711b7771fa7eaba00b684889688f` y SHA-256 `d35e2799ed3c01b13d3b1bdc65063953b52286901e907f5f11f69efefdaa5ef2`. Se publican únicamente estos hashes, nunca las ROMs.
- [Radical Red](https://github.com/SeCaVa/RadicalRed-TraduccionCastellano) y [Lazarus](https://github.com/SeCaVa/PokemonLazarus-Traduccion) requieren el hack inglés ya aplicado. Se localizaron sus bases en las carpetas de trabajo de SeCaVa y se calcularon los siguientes hashes localmente, comprobando tamaño de 33554432 bytes y CRC32 contra las Releases. Solo se incorporan los hashes al catálogo, nunca los archivos.

| Base inglesa | SHA-1 | SHA-256 |
|---|---|---|
| Radical Red 4.1 | `964f951a0fdaf209e4ea1344883ef0d557bb3a80` | `679d112cdfe699c2793d82c7e7999ac9dfca9e222ad5a85d4f8f1e457cd0283f` |
| Lazarus v2 | `7dcdc7e280bc4631487e13dd37e6e0cea04adea6` | `d756b2783dede0bb2c534d1f07713bef733cf53500388e3912f14220a7e16e97` |

Región o revisión desconocida se indica expresamente como no documentada. No se añaden portadas, logos ni sprites ajenos.
