# Publicar en GitHub Pages

La publicación utiliza el repositorio [SeCaVa/secava-parcheador](https://github.com/SeCaVa/secava-parcheador), creado con la autorización de SeCaVa para completar el despliegue. El destino de Pages es [secava.github.io/secava-parcheador](https://secava.github.io/secava-parcheador/). El estado de cada publicación se consulta en [el workflow de Pages](https://github.com/SeCaVa/secava-parcheador/actions/workflows/pages.yml).

## Preparación

1. Revisa el estado de las cinco fichas y las discrepancias de `AUDITORIA-CATALOGO.md`.
2. Confirma los permisos de los parches que se van a servir; la licencia MIT de la web no cubre juegos o modificaciones ajenas.
3. Crea un repositorio público para la web, por ejemplo `secava-parcheador`, usando `main` como rama. No actives Pages en los cinco repositorios de traducción para esta aplicación.
4. Sube el código fuente y el lockfile. No subas `node_modules`, `.cache`, ROMs ni resultados. `public/patches/` y `dist/` se generan en Actions y se ignoran en Git.
5. En **Settings → Pages → Build and deployment**, elige **GitHub Actions** como fuente.
6. Ejecuta «Verificar y publicar en GitHub Pages» o haz push a `main`. El workflow valida catálogo, parches, tests, TypeScript, build y navegadores antes de subir el artefacto de Pages.

El job `deploy` necesita `pages: write` y `id-token: write`, y usa el entorno `github-pages`. El job de build solo tiene `contents: read`. No necesita un PAT para leer Releases públicas; usa el token efímero de Actions para las consultas condicionales de API. Ningún token se incluye en Vite ni en `dist/`.

Puedes configurar aprobaciones del entorno `github-pages` para que cada publicación requiera tu revisión. La ejecución diaria está definida a las 08:23 UTC; GitHub puede retrasar ejecuciones programadas. Si no se importa ninguna versión nueva, esa ejecución no vuelve a publicar.

## Rutas y dominio

`vite.config.ts` usa `base: './'`: HTML, CSS, Worker, catálogo y parches funcionan bajo `https://<cuenta>.github.io/<repositorio>/`. No hay router con history ni necesidad de un 404.html de fallback.

Para probar una base absoluta específica:

```powershell
$env:BASE_PATH='/secava-parcheador/'
npm run build
Remove-Item Env:BASE_PATH
```

Si se configura un dominio propio, añade el CNAME según Pages y conserva HTTPS. No introduzcas URLs absolutas de la máquina de desarrollo en el catálogo generado.

## Rollback y mantenimiento

Restaura el commit anterior del catálogo/código y despliega de nuevo. Los parches se fijan por SHA-256: un asset reemplazado o retirado provoca un error explícito. La caché sirve como optimización, no como sustituto de las verificaciones. Una compilación fallida no publica un artefacto parcial.

Al retirar versiones, `npm run catalog` elimina los archivos BPS/UPS con nombre de hash que ya no estén referenciados dentro de su propia carpeta `public/patches`, después de completar la validación. No recorre otras carpetas ni borra ROMs del usuario. Los checkouts limpios de Actions y el build de Vite preparan de nuevo el artefacto publicado.

Ver documentación oficial: [workflows personalizados de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [límites de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [peticiones condicionales de GitHub](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).
