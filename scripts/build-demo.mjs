// 미리보기용 단일 HTML(dist/demo.html)을 만든다.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

await build({
  entryPoints: ['demo/main.tsx'],
  bundle: true,
  minify: true,
  outdir: 'dist/demo',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});

const js = readFileSync('dist/demo/main.js', 'utf8').replace(/<\/script/g, '<\\/script');
const css = readFileSync('dist/demo/main.css', 'utf8');
// 미리보기 페이지는 Claude Artifact로 올리므로 html/head/body 태그 없이 내용만 쓴다.
const html = `<title>맞츄 프로토타입</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/demo.html', html);
console.log(`dist/demo.html (${Math.round(html.length / 1024)}KB)`);
