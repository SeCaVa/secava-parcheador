import './style.css';
import { catalogSchema, identify, matches, type Catalog, type Project, type Release, type Fingerprint } from './core/catalog';
import { MAX_ROM } from './core/patch';
import { downloadPatch } from './core/download';

const root = document.querySelector<HTMLDivElement>('#app')!;
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const size = (n: number) => n < 1024 ? `${n} bytes` : `${(n / 1048576).toLocaleString('es-ES', { maximumFractionDigits: 2 })} MiB`;
const label = { active: 'Activo', outdated: 'Desactualizado', experimental: 'Experimental' };
let catalog: Catalog = { schemaVersion: 1, projects: [] };
let selectedProject = '', selectedRelease = '', hashes: Fingerprint | undefined;
let fileName = '', busy = false, downloadUrl = '', sound = false;
let request: AbortController | undefined;
let worker: Worker;
let audio: AudioContext | undefined;
const base = new URL(import.meta.env.BASE_URL, location.href).href;

root.innerHTML = `
  <a class="skip" href="#terminal">Saltar al parcheador</a>
  <header class="header"><a class="brand" href="./"><span class="brand-icon" aria-hidden="true">S<span>▰</span></span><span><b>SeCaVa</b> <small>TRADUCCIONES</small></span></a>
    <nav aria-label="Navegación principal"><a class="nav-active" href="#terminal">Parcheador</a><a href="#catalogo">Catálogo</a><a href="#ayuda">Cómo funciona</a></nav>
    <button class="sound" id="sound" aria-pressed="false" title="Activar sonidos">♪ <span>Sonido: no</span></button>
  </header>
  <main><section class="intro"><div><p class="eyebrow"><span class="green-dot"></span> TERMINAL DE TRADUCCIÓN · ES-ES</p><h1>Tus aventuras.<br>Ahora, <em>en castellano.</em></h1><p>Tu ROM, el parche correcto y un nuevo idioma.<br class="desktop"> Todo desde el navegador. Así de sencillo.</p></div><div class="intro-note"><span class="mini-cartridge" aria-hidden="true">ES</span><span>Hecho con paciencia.<br><b>Para jugar en tu idioma.</b></span></div></section>
  <div class="workspace"><section id="terminal" class="device" aria-labelledby="terminal-title"><div class="device-top"><span class="lens" aria-hidden="true"></span><span class="led red" aria-hidden="true"></span><span class="led yellow" aria-hidden="true"></span><span class="led green" aria-hidden="true"></span><span class="device-model">SCV / TRANSLATION SYSTEM</span></div>
    <div class="device-body"><div class="screen-label"><h2 id="terminal-title">01 / CARGA TU ROM</h2><span>PROCESAMIENTO LOCAL</span></div>
    <div class="screen"><div class="screen-top"><span><i aria-hidden="true"></i> <span id="screen-state">LISTO PARA CONECTAR</span></span><span aria-hidden="true">▮▮▮</span></div>
      <div id="drop-zone" class="drop-zone"><div class="cartridge" aria-hidden="true"><div class="cart-label"><span>SCV</span><b>↧</b><small>ROM FILE</small></div><div class="cart-pins"></div></div>
        <h3>Tu próxima aventura<br>empieza aquí.</h3><p>Arrastra tu ROM a esta pantalla</p><span class="or">o</span><button id="choose" class="primary">Seleccionar ROM <span aria-hidden="true">↗</span></button>
        <small>ARCHIVO SIN COMPRIMIR · HASTA 64 MiB</small></div>
      <input class="visually-hidden" id="rom-file" type="file" accept=".gba,.gbc,.gb,.nes,.sfc,.smc,.bin,.rom" aria-label="Seleccionar archivo ROM">
      <div class="file-info" id="file-info" hidden></div>
      <div class="screen-bottom"><span aria-hidden="true">◆</span><span>Tu archivo se queda en tu dispositivo.</span><span aria-hidden="true">◆</span></div></div>
    <div class="operation"><div class="operation-title"><span id="phase-label">ESPERANDO ROM</span><span id="percent">—</span></div><progress id="progress" max="100" value="0" aria-label="Progreso de la operación"></progress><p id="live" role="status" aria-live="polite">El sistema reconocerá tu ROM por sus hashes.</p><button id="cancel" class="text-button" hidden>Cancelar operación</button></div>
    <div id="selection" class="selection" hidden></div>
    <div class="device-controls"><div class="steps" aria-label="Pasos"><span id="step-1" class="current"><b>1</b> Identifica</span><i></i><span id="step-2"><b>2</b> Traduce</span><i></i><span id="step-3"><b>3</b> Descarga</span></div><button id="reset" class="reset" title="Reiniciar parcheador" aria-label="Reiniciar parcheador">↺</button></div>
    </div><div class="device-foot"><span>SECAVA TRADUCCIONES</span><span aria-hidden="true">▰ ▰ ▰ ▰ ▰</span></div></section>
  <aside id="catalogo" class="catalog" aria-labelledby="catalog-title"><div class="catalog-heading"><div><p class="eyebrow">ELIGE TU AVENTURA</p><h2 id="catalog-title">Archivo de traducciones<span>.</span></h2></div><span class="count" id="count">05</span></div>
    <p class="catalog-sub">Explora el catálogo o deja que tu ROM elija por ti.</p><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Buscar una traducción…" aria-label="Buscar traducciones"><kbd aria-hidden="true">/</kbd></label>
    <div class="catalog-filter"><span id="catalog-mode">TODOS LOS PROYECTOS</span><span>CASTELLANO <b>ES</b></span></div><div id="project-list" class="project-list"></div>
    <p class="catalog-caption"><span class="green-dot"></span> <span id="catalog-summary">Consultando catálogo…</span></p>
  </aside></div>
  <section class="promises" aria-label="Características"><div><span aria-hidden="true">▣</span><b>100 % en tu dispositivo</b><p>Ni tu ROM ni sus hashes salen del navegador.</p></div><div><span aria-hidden="true">✓</span><b>Cada byte, comprobado</b><p>ROM, parche y resultado verificados.</p></div><div><span aria-hidden="true">↯</span><b>Sin instalaciones</b><p>Abre, arrastra y juega en tu idioma.</p></div></section>
  <section id="ayuda" class="help"><div><p class="eyebrow">MANUAL DE CAMPO</p><h2>Un momento para traducir.<br>Horas para explorar.</h2></div><div class="faq"><details><summary>¿Qué archivo necesito?</summary><p>Una copia propia de la ROM base exacta indicada en la ficha del proyecto, sin comprimir. El nombre no determina la compatibilidad: comprobamos tamaño, CRC32 y los hashes fuertes registrados. Radical Red y Lazarus requieren previamente sus hacks en inglés.</p></details><details><summary>¿Cómo funciona la identificación?</summary><p>Calculamos CRC32, SHA-1 y SHA-256 en un Web Worker local. Comparamos todos los valores registrados. Solo ofrecemos parches compatibles y verificamos además el SHA-256 del parche, sus tres CRC internos y el resultado.</p></details><details><summary>¿Qué ocurre con mi ROM y mi privacidad?</summary><p>Tu archivo solo se lee en memoria. No se suben ROMs, nombres ni hashes; no hay analítica ni servidores de procesamiento. La web descarga su catálogo y los parches declarados. Reiniciar libera los datos de la operación. No alojamos ni enlazamos ROMs comerciales.</p></details><details><summary>¿Por qué alguna versión está pendiente?</summary><p>Si faltan hashes de referencia o los datos publicados no coinciden con el parche, la descarga queda bloqueada. La ficha indica exactamente qué dato falta o discrepa. Una versión nueva nunca hereda automáticamente la compatibilidad de otra.</p></details><details><summary>¿Funciona en el móvil?</summary><p>Sí, en navegadores modernos con HTTPS, Web Workers y WebCrypto. Admitimos originales y resultados de hasta 64 MiB y parches de hasta 40 MiB. El navegador necesita memoria adicional; cierra otras pestañas si no puede completar la operación. No es una garantía para todos los dispositivos.</p></details></div></section>
  </main><footer><a class="footer-brand" href="#">SeCaVa <span>TRADUCCIONES</span></a><p>Un proyecto de fans, hecho para la comunidad.<br>Sin afiliación con Nintendo, GAME FREAK o The Pokémon Company.</p><a href="#ayuda">Privacidad y ayuda ↗</a></footer>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function beep() {
  if (!sound) return;
  try { audio ??= new AudioContext(); void audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.type = 'square'; o.frequency.value = 660; g.gain.setValueAtTime(.025, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .09); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .1); } catch { /* Sound is optional. */ }
}
function announce(message: string, error = false) { $('#live').textContent = message; $('#live').classList.toggle('error', error); }
function phase(text: string, n: number | null = 0) { $('#phase-label').textContent = text; $('#percent').textContent = n === null ? '…' : `${n} %`; const p = $<HTMLProgressElement>('#progress'); if (n === null) p.removeAttribute('value'); else p.value = n; }
function setBusy(value: boolean) { busy = value; $('#cancel').hidden = !value; $<HTMLButtonElement>('#choose').disabled = value; $<HTMLInputElement>('#rom-file').disabled = value; $<HTMLButtonElement>('#reset').disabled = value; renderProjects(); renderSelection(); }
function clearDownload() { if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = ''; }
function bootWorker() {
  worker?.terminate(); worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'identified') {
      hashes = data.hashes; const found = identify(hashes!, catalog);
      if (!selectedProject && found.length) { selectedProject = found[0].project.id; selectedRelease = found[0].release.id; }
      phase(found.length ? 'ROM IDENTIFICADA' : 'SIN COINCIDENCIA', 100);
      $('#screen-state').textContent = found.length ? 'CONEXIÓN VERIFICADA' : 'ROM NO REGISTRADA';
      announce(found.length ? `${found.length} traducción(es) compatible(s). Selecciona una versión para continuar.` : 'Tu ROM no está registrada como compatible en el catálogo habilitado. Consulta la base requerida; no se aplicará ningún parche.');
      $('#step-2').classList.add('current'); beep(); setBusy(false); renderFile();
    } else if (data.type === 'progress') phase('APLICANDO TRADUCCIÓN', 35 + Math.floor(data.value * .55));
    else if (data.type === 'done') {
      clearDownload(); downloadUrl = URL.createObjectURL(new Blob([data.result], { type: 'application/octet-stream' }));
      phase('TRADUCCIÓN COMPLETADA', 100); $('#screen-state').textContent = 'AVENTURA LISTA';
      announce(`Resultado verificado. CRC32 ${data.hashes.crc32.toUpperCase()}. Ya puedes descargarlo.`);
      $('#step-3').classList.add('current'); setBusy(false); beep(); $('#download')?.focus();
    } else if (data.type === 'error') { setBusy(false); phase('OPERACIÓN DETENIDA'); announce(data.message, true); }
  };
  worker.onerror = () => { hashes = undefined; setBusy(false); renderFile(); bootWorker(); phase('OPERACIÓN DETENIDA'); announce('El Worker no pudo completar la operación. Puede faltar memoria. Vuelve a cargar el archivo o prueba en otro dispositivo.', true); };
}
function selected() { const project = catalog.projects.find(p => p.id === selectedProject); return { project, release: project?.releases.find(r => r.id === selectedRelease) }; }
function hashDetails(h: { crc32: string; sha1?: string; sha256?: string }, bytes?: number) { return `<dl class="hashes">${bytes === undefined ? '' : `<dt>Tamaño</dt><dd>${esc(size(bytes))}</dd>`}${(['crc32', 'sha1', 'sha256'] as const).filter(k => h[k]).map(k => `<dt>${k.toUpperCase().replace('SHA', 'SHA-')}</dt><dd>${esc(h[k]?.toUpperCase())}</dd>`).join('')}</dl>`; }
function renderFile() {
  $('#drop-zone').classList.toggle('compact', !!hashes);
  const info = $('#file-info'); info.hidden = !hashes;
  if (hashes) {
    const bases = new Map(identify(hashes, catalog).flatMap(({release})=>release.bases.filter(b=>matches(hashes!,b)).map(b=>[b.id,b] as const)));
    const identity = [...bases.values()].map(b=>`${b.name} · ${b.region} · ${b.revision}`);
    info.innerHTML = `<div class="file-heading"><span aria-hidden="true">▣</span><div><b>${esc(fileName)}</b><span>${esc(size(hashes.size))} · archivo local</span></div></div>${identity.length ? `<p class="identity"><b>ROM base reconocida</b><br>${identity.map(esc).join('<br>')}</p>` : ''}<details><summary>Ver los hashes de tu archivo</summary>${hashDetails(hashes, hashes.size)}</details>`;
  }
}
function renderProjects() {
  const query = $<HTMLInputElement>('#search').value.toLocaleLowerCase('es');
  const visible = catalog.projects.filter(p => p.name.toLocaleLowerCase('es').includes(query));
  $('#count').textContent = String(catalog.projects.filter(p => !p.demo).length).padStart(2, '0');
  $('#project-list').innerHTML = visible.map(p => {
    const compatible = hashes && p.releases.some(r => r.bases.some(b => matches(hashes!, b)));
    const symbol = p.demo ? '⌘' : (['◇', '▟', '✦', '▥', '↯'][p.number - 1] ?? '▣');
    const art = p.image ? `<img src="${esc(new URL(p.image, base).href)}" alt="" loading="lazy">` : `<span>${symbol}</span>`;
    return `<button class="project ${p.id === selectedProject ? 'selected' : ''}" data-project="${esc(p.id)}" ${busy ? 'disabled' : ''} aria-pressed="${p.id === selectedProject}"><span class="project-art art-${esc(p.id)}" aria-hidden="true">${art}</span><span class="project-copy"><span class="project-meta">N.º ${String(p.number).padStart(3, '0')} <i>·</i> ${esc(p.platform)}</span><strong>${esc(p.name.replace('Pokémon ', ''))}</strong><span class="project-status ${compatible ? 'compatible' : ''}">${compatible ? '✓ Compatible con tu ROM' : p.demo ? 'Demostración sintética' : p.releases.length ? `${esc(label[p.status])} · ${esc(p.releases[0].version)}` : 'Pendiente de verificación'}</span></span><span class="project-arrow" aria-hidden="true">↗</span></button>`;
  }).join('') || '<p class="empty">No hay proyectos con ese nombre.</p>';
  $('#catalog-mode').textContent = hashes ? 'COMPATIBILIDAD COMPROBADA' : 'TODOS LOS PROYECTOS';
  const enabled = catalog.projects.filter(p => !p.demo && p.releases.length).length;
  $('#catalog-summary').textContent = `${enabled} de ${catalog.projects.filter(p=>!p.demo).length} proyectos habilitados · datos verificados`;
}
function renderSelection() {
  const { project: p } = selected(); const area = $('#selection'); area.hidden = !p;
  if (!p) return;
  if (!p.releases.some(r => r.id === selectedRelease)) selectedRelease = p.releases[0]?.id ?? '';
  const r = p.releases.find(r => r.id === selectedRelease);
  const compatible = !!(r && hashes && r.bases.some(b => matches(hashes!, b)));
  area.innerHTML = `<p class="eyebrow">02 / TU TRADUCCIÓN ${p.demo ? '· DEMOSTRACIÓN' : ''}</p><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><p class="credit">Juego: ${esc(p.author ?? 'Autor pendiente de documentar')}<br>${esc(p.credits)}</p>
    ${p.releases.length ? `<label class="version-label" for="version">Versión de la traducción</label><select id="version" ${busy ? 'disabled' : ''}>${p.releases.map(r => `<option value="${esc(r.id)}" ${r.id === selectedRelease ? 'selected' : ''}>${esc(r.version)} · ${r.format.toUpperCase()} · ${esc(r.publishedAt)}</option>`).join('')}</select>` : `<p class="notice">${esc(p.pendingReason ?? 'Faltan los datos de compatibilidad.')}</p>`}
    <p class="instructions">${esc(r?.instructions ?? p.instructions)}</p>
    ${r ? `<details class="base-details"><summary>ROM base y datos de verificación</summary>${r.bases.map(b => `<h4>${esc(b.name)}</h4><p>${esc(b.region)} · Revisión ${esc(b.revision)}</p>${hashDetails(b.hashes, b.size)}`).join('')}<h4>Parche ${esc(r.format.toUpperCase())}</h4>${hashDetails({ crc32: '', sha256: r.patch.sha256 }, r.patch.size)}<h4>Resultado: ${esc(r.output.name)}</h4>${hashDetails(r.output.hashes, r.output.size)}</details>` : ''}
    ${hashes && r && !compatible ? '<p class="notice">Tu archivo no coincide con la ROM base de esta versión. Revisa los hashes y la revisión indicados.</p>' : ''}
    ${downloadUrl ? `<a id="download" class="primary download" href="${downloadUrl}" download="${esc(r?.output.name ?? 'traduccion.bin')}">Descargar resultado verificado ↓</a>` : `<button id="apply" class="primary apply" ${busy || !compatible ? 'disabled' : ''}>Aplicar traducción <span aria-hidden="true">→</span></button>${!hashes && r ? '<small>Carga tu ROM para verificar su compatibilidad.</small>' : ''}`}
    ${!p.demo ? `<a class="repo-link" href="${esc(p.repository)}" target="_blank" rel="noopener noreferrer">Repositorio y créditos ↗</a>${r ? `<a class="repo-link" href="${esc(r.releaseUrl)}" target="_blank" rel="noopener noreferrer">Notas de ${esc(r.version)} ↗</a>` : ''}` : ''}
    ${(p.pendingReleases?.length ?? 0) ? `<details class="pending"><summary>Versiones pendientes (${p.pendingReleases!.length})</summary>${p.pendingReleases!.map(r => `<article><h4>${esc(r.version)} · ${esc(r.publishedAt)}</h4><p>${esc(r.blockedReason)}</p><p>Base: ${esc(r.bases[0].name)} (${esc(r.bases[0].revision)})</p>${hashDetails(r.bases[0].hashes, r.bases[0].size)}<a href="${esc(r.releaseUrl)}" target="_blank" rel="noopener noreferrer">Consultar Release ↗</a></article>`).join('')}</details>` : ''}`;
  $('#version')?.addEventListener('change', event => { selectedRelease = (event.target as HTMLSelectElement).value; clearDownload(); renderSelection(); });
  $('#apply')?.addEventListener('click', () => { void apply(); });
}
async function loadFile(file: File) {
  if (busy) return;
  if (!file.size || file.size > MAX_ROM) { announce('Selecciona un archivo de entre 1 byte y 64 MiB. En móvil, archivos grandes pueden requerir otro dispositivo.', true); return; }
  clearDownload(); hashes = undefined; fileName = file.name; bootWorker(); renderFile();
  phase('CALCULANDO HASHES', null); announce('Leyendo y calculando CRC32, SHA-1 y SHA-256 en tu dispositivo…');
  $('#screen-state').textContent = 'IDENTIFICANDO ROM'; setBusy(true); worker.postMessage({ type: 'identify', file });
}
async function apply() {
  const { release } = selected();
  if (busy || !release || !hashes || !release.bases.some(b => matches(hashes!, b))) return;
  if (!release.patch.path) { announce('El parche no está preparado en este despliegue. Contacta con el mantenedor.', true); return; }
  setBusy(true); phase('DESCARGANDO PARCHE', 0); announce('Descargando el parche oficial verificado…');
  const controller = new AbortController(); request = controller;
  try {
    const patch = await downloadPatch(release.patch.path, base, controller.signal, n => phase('DESCARGANDO PARCHE', Math.floor(n * .3)));
    if (controller.signal.aborted) return;
    phase('VERIFICANDO Y APLICANDO', 35); announce('Verificando el parche, aplicando la traducción y comprobando el resultado…');
    worker.postMessage({ type: 'apply', release, patch: patch.buffer }, [patch.buffer]);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    setBusy(false); phase('DESCARGA DETENIDA'); announce(error instanceof Error ? error.message : 'Error de descarga. Comprueba tu conexión y reintenta.', true);
  }
}
$('#choose').addEventListener('click', () => $<HTMLInputElement>('#rom-file').click());
$('#rom-file').addEventListener('change', event => { const input = event.target as HTMLInputElement; if (input.files?.[0]) void loadFile(input.files[0]); input.value = ''; });
for (const event of ['dragover', 'drop']) window.addEventListener(event, e => e.preventDefault());
$('#drop-zone').addEventListener('dragover', event => { event.preventDefault(); if (!busy) $('#drop-zone').classList.add('dragging'); });
$('#drop-zone').addEventListener('dragleave', () => $('#drop-zone').classList.remove('dragging'));
$('#drop-zone').addEventListener('drop', event => { event.preventDefault(); $('#drop-zone').classList.remove('dragging'); if (event.dataTransfer?.files.length !== 1) announce('Arrastra un único archivo ROM sin comprimir.', true); else void loadFile(event.dataTransfer.files[0]); });
$('#project-list').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-project]');
  if (!button || busy) return;
  selectedProject = button.dataset.project!; selectedRelease = ''; clearDownload(); beep(); renderProjects(); renderSelection();
  $('#selection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
});
$('#search').addEventListener('input', renderProjects);
document.addEventListener('keydown', event => { if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) { event.preventDefault(); $('#search').focus(); } });
function reset() {
  request?.abort(); request = undefined; bootWorker(); hashes = undefined; fileName = ''; selectedProject = ''; selectedRelease = ''; clearDownload(); setBusy(false); renderFile();
  phase('ESPERANDO ROM'); announce('El sistema reconocerá tu ROM por sus hashes.'); $('#screen-state').textContent = 'LISTO PARA CONECTAR'; $('#step-2').classList.remove('current'); $('#step-3').classList.remove('current');
}
$('#cancel').addEventListener('click', () => { reset(); announce('Operación cancelada. Se han liberado sus datos.'); });
$('#reset').addEventListener('click', reset);
$('#sound').addEventListener('click', () => { sound = !sound; $('#sound').setAttribute('aria-pressed', String(sound)); $('#sound span').textContent = `Sonido: ${sound ? 'sí' : 'no'}`; beep(); });
window.addEventListener('pagehide', () => { clearDownload(); worker?.terminate(); request?.abort(); });
async function init() {
  try {
    if (!window.Worker || !crypto.subtle) throw new Error('Necesitas un navegador moderno con HTTPS (o localhost), Web Workers y WebCrypto.');
    const response = await fetch(new URL('catalog.json', base), { credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error(`No se pudo leer el catálogo (HTTP ${response.status}).`);
    catalog = catalogSchema.parse(await response.json()); bootWorker(); renderProjects();
  } catch (error) { phase('CATÁLOGO NO DISPONIBLE'); announce(error instanceof Error ? error.message : 'Catálogo inválido.', true); $<HTMLButtonElement>('#choose').disabled = true; }
}
void init();
