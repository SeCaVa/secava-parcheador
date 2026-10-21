import { defineConfig } from 'vite';
import { randomBytes } from 'node:crypto';
export default defineConfig(({ command }) => {
  const nonce = randomBytes(16).toString('base64');
  return {
    base: process.env.BASE_PATH || './', build: { target: 'es2022' },
    html: command === 'serve' ? { cspNonce: nonce } : undefined,
    plugins: [{
      name: 'secava-development-csp', apply: 'serve',
      transformIndexHtml: html => html
        .replace("style-src 'self'", `style-src 'self' 'nonce-${nonce}'`)
        .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:*")
    }]
  };
});
