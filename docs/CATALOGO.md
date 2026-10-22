# Añadir traducciones y actualizar versiones

## Fuente de verdad

Edita `catalog/projects.json`, no `public/catalog.json` (generado). El esquema ejecutable está en `src/core/catalog.ts`; se valida en el build y al leer el catálogo en el navegador.

Un proyecto contiene `id` estable en minúsculas con guiones, número único de catálogo, nombre, descripción, autor original, créditos, plataforma, repositorio oficial, instrucciones y estado (`active`, `outdated`, `experimental`). Opcionalmente admite `image`, por ejemplo `images/mi-portada.webp`: guarda el recurso autorizado en `public/images/`. Solo se aceptan rutas locales a PNG/JPG/WebP/SVG, sin URLs externas. La entrega inicial utiliza arte geométrico propio.

Una versión en `releases` declara:

- `id`, `version` y `publishedAt` (YYYY-MM-DD).
- `format`: `bps` o `ups`. No subir ZIP como si fuera un parche.
- `bases`: una o varias bases **documentadas expresamente**, cada una con nombre, región, revisión, tamaño exacto en bytes, CRC32 y SHA-1 o SHA-256. `evidence` identifica la fuente.
- `patch`: URL exacta del asset oficial bajo `https://github.com/SeCaVa/<repo>/releases/download/…`, SHA-256 y tamaño exacto. No usar `latest/download`.
- `releaseUrl`: URL de la etiqueta de esa Release.
- `output`: nombre sencillo para descarga, tamaño exacto y hashes esperados. CRC32 es obligatorio; añadir SHA-1/SHA-256 cuando se disponga de un resultado verificado.
- `instructions`: requisitos específicos de esa versión.
- `redistribution`: `allowed: true` y evidencia del permiso del mantenedor. Revisar además las autorizaciones de los componentes de terceros.

`patch.path` lo genera el build, nunca se escribe una URL externa para el navegador. Las versiones no verificadas van en `pendingReleases`, con `blockedReason`, y sin declaración de redistribución. Una ficha sin versiones habilitadas incluye `pendingReason`.

## Procedimiento manual

1. Publica el parche BPS/UPS correcto en tu Release y documenta exactamente la base necesaria.
2. Calcula localmente hashes/tamaño del original y de la salida con `npm run hash -- "archivo"`. No subas ninguna ROM al repositorio ni a servicios externos.
3. Calcula el SHA-256 del parche del mismo modo. Compara con el digest del asset de GitHub; comprueba que no se ha reemplazado después de tomar los hashes.
4. Copia una versión existente del JSON y actualiza sus datos. Para Lazarus/Radical Red, añade el hash fuerte que falta a su base y mueve la versión de `pendingReleases` a `releases`, quitando `blockedReason` y añadiendo `redistribution`.
5. `npm run catalog` comprueba SHA-256, CRC del parche, formato, tamaños, CRC de origen y CRC de salida frente al catálogo. Una divergencia aborta el build.
6. Ejecuta `npm test`, `npm run build` y las pruebas de navegador disponibles. Revisa la ficha en la vista previa.
7. Publica los cambios en el repositorio del parcheador mediante tu proceso habitual. La aplicación no edita ni publica repositorios por sí sola.

No cambies un hash esperado simplemente para silenciar una divergencia. Confirma primero la versión real y corrige la documentación oficial o el asset que corresponda. Se pueden mantener varias versiones por proyecto con bases diferentes; ninguna hereda compatibilidad automáticamente.

## Importación automática desde Releases

Para no modificar el código ni el catálogo central con cada publicación, adjunta a la Release un asset UTF-8 llamado **`secava-release.json`**. Su estructura es:

```json
{
  "schemaVersion": 1,
  "projectId": "identificador-existente",
  "release": { "...": "objeto completo de una versión según el esquema" }
}
```

El bloque anterior es ilustrativo, no es un manifiesto válido para copiar tal cual. `catalog/release-manifest.example.json` contiene un objeto completo con los datos reales de Ghost Grey v0.5 como referencia. Cambia todos los valores correspondientes a tu nueva versión; no reutilices hashes de otra base.

```sh
npm run check:releases
npm run check:releases -- --import
npm run build
```

La primera orden solo informa. `--import` modifica la copia local de `catalog/projects.json` al encontrar manifiestos válidos y conserva importaciones en `.cache/releases/imported.json`. No crea commits, issues ni PRs. La versión, fecha, proyecto, URL de Release y asset deben corresponder a la misma publicación; se comprueba también el digest GitHub cuando existe. Una prerelease solo se importa a un proyecto marcado experimental.

El workflow de Pages ejecuta la importación antes del build. Las importaciones se conservan en la caché de Actions para no redesplegar a diario la misma versión. Si esa caché se purga, se reconstruyen a partir de los manifiestos de las Releases. El JSON central tiene precedencia sobre las versiones con la misma URL; para retirar una versión automática, elimina su manifiesto y la entrada de la caché, o invalida la caché `patches-*` en Actions.

Se consulta la lista de hasta 100 Releases por proyecto, una vez al día en el workflow de reserva, con ETag y `If-None-Match`, sin peticiones desde el navegador. Los tokens solo se usan contra `api.github.com`. Un fallo o rate limit detiene la comprobación; no hay bucles de reintento. El informe queda en el resumen de Actions. Los manifiestos sin datos fuertes no se importan; las Releases sin manifiesto solo se notifican.

Como alternativa al sondeo diario, dispara `repository_dispatch` con tipo `translation-release` desde un workflow autorizado de tus repositorios de traducción, o ejecuta `workflow_dispatch` manualmente; puedes retirar `schedule` del YAML. El evento **solo despierta** la comprobación: sus datos no se aceptan como compatibilidad ni como órdenes.

## Nuevos proyectos y otros formatos

Añade una ficha con número e ID únicos. El catálogo admite decenas de proyectos; la lista es filtrable y no tiene rutas que requieran rewrites en Pages. Solo el mantenedor configura repositorios (el esquema restringe esta instalación a la cuenta SeCaVa).

Si un proyecto no usa BPS/UPS, deja `releases: []` e indica `pendingReason` e instrucciones específicas, con enlace a su repositorio oficial. No lo etiquetes falsamente como BPS/UPS. Este motor no aplica IPS, xdelta, APK ni instaladores.
