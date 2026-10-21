# Arquitectura y garantías

## Flujo

1. El navegador descarga `catalog.json` del mismo origen y lo valida con Zod. No consulta servicios de identificación.
2. Un File seleccionado o arrastrado se clona estructuralmente al Worker. Allí se lee una vez y se conserva el original en memoria.
3. Se calculan CRC32, SHA-1 y SHA-256; los digest de WebCrypto se realizan de forma secuencial para evitar copias simultáneas. No se usa el nombre para identificar el juego.
4. Se compara tamaño y **todos** los hashes de la base registrada. Cada versión habilitada debe declarar CRC32 y al menos SHA-1 o SHA-256. La selección manual y automática comparten `matches` y `translate`.
5. La interfaz descarga únicamente el parche preparado del mismo origen. El Worker verifica tamaño, SHA-256, formato y CRC del parche, tamaño y CRC de origen y todos los datos de la salida declarada.
6. Se aplica BPS/UPS y se comprueba CRC32 del resultado. Si el catálogo declara SHA-1/SHA-256 de salida, también se comprueban. Se transfiere el ArrayBuffer a la interfaz y se crea un Blob descargable.
7. Cancelar termina el Worker y aborta la descarga. Reiniciar o cargar otro archivo revoca la URL Blob anterior. No hay almacenamiento persistente de ROMs ni resultados.

El CRC32 detecta corrupción y el SHA-1 facilita identificar dumps conocidos. SHA-1 no se presenta como firma criptográfica. SHA-256 fija el parche esperado; su autenticidad depende del catálogo/release de confianza, no de una firma digital independiente.

## Motor binario

Implementación original en TypeScript, basada en la especificación de byuu y contrastada con implementaciones públicas. BPS ejecuta las cuatro acciones; TargetCopy permite repetición solapada byte a byte. Los varints usan aritmética de Number con comprobación de entero seguro, sin desplazar tamaños con operaciones bit a bit de 32 bits.

UPS aplica en la dirección **base declarada → traducción**, con XOR, salto implícito tras el cero y relleno virtual con ceros para tamaños distintos. El formato permite reversibilidad, pero esta aplicación no ofrece invertir una traducción: el catálogo fija expresamente la dirección. No hay fallback que omita validación.

Se rechazan truncamientos, metadatos fuera de rango, offsets negativos inválidos, lecturas futuras, comandos que exceden el destino y archivos con checksums incorrectos antes de ofrecer descargas. No se interpretan los metadatos del parche como HTML/XML ejecutable.

## Recursos y límites

- Original: 1 byte–64 MiB; resultado: hasta 64 MiB; parche: hasta 40 MiB. Son límites de esta aplicación, no de los formatos.
- `SubtleCrypto.digest` no es streaming: requiere todo el archivo en memoria ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)). BPS necesita acceso aleatorio a origen y salida. No se afirma que pueda procesar imágenes de disco grandes con memoria constante.
- La memoria real supera el tamaño de la ROM: original, resultado, parche, copias temporales de WebCrypto, Blob y buffers de descarga. Para el máximo pueden requerirse varios cientos de MiB libres. La recolección de basura y la memoria disponible dependen del navegador y del dispositivo.
- El Worker protege la capacidad de respuesta, no elimina los límites de memoria. La interfaz maneja errores recuperables y permite cancelar. No puede interceptar con garantías que el sistema operativo termine una pestaña entera por falta de memoria.
- Las pruebas móviles usan viewports y características emuladas; falta validación en dispositivos físicos de poca memoria.

## GitHub y Pages

El build descarga parches oficiales públicos fijados por URL de Release y SHA-256. Verifica cabecera/footer y prepara nombres direccionados por hash en `public/patches/`. Así no depende de CORS de los assets de GitHub en tiempo de uso y no incluye tokens en el cliente.

No hay proxy público, backend ni service worker. La CSP limita `connect-src`, scripts, imágenes y Workers al propio origen. No se cargan fuentes, iconos, imágenes ni métricas externas. Los enlaces de documentación/repositorio se abren solo por acción del usuario, con `noreferrer`.

Solo en desarrollo, Vite añade un nonce aleatorio para los estilos que inyecta y permite su WebSocket local en `127.0.0.1`. La compilación de producción conserva la CSP estricta del HTML, sin esta excepción de desarrollo.

Pages tiene límites de tamaño y transferencia ([documentación oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). La entrega inicial incluye aproximadamente 43 MiB de parches habilitados, por debajo de 1 GiB. Con decenas de versiones hay que retirar assets obsoletos del catálogo o replantear el alojamiento de parches; no descargar toda la historia sin control.

La copia local de los parches la solicita el propio mantenedor. El despliegue público requiere revisar los permisos de los componentes ajenos; véase LICENCIAS.md.
