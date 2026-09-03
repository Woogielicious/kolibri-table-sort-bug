/**
 * Kopiert die KoliBri-Icon-Fonts aus dem Theme-Paket nach public/.
 *
 * Nötig, weil @public-ui/theme-default in package.json nur "." als export
 * definiert – ein direkter Import von "@public-ui/theme-default/assets/..."
 * wird von Node/Vite deshalb blockiert. Ohne diese Dateien fehlen sämtliche
 * Icons (Sortier-Pfeile, Pagination-Chevrons, Select-Pfeil).
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/@public-ui/theme-default/assets');
const target = resolve(root, 'public');

if (!existsSync(source)) {
	console.warn('[copy-icons] Theme-Assets nicht gefunden – bitte zuerst "npm install" ausführen.');
	process.exit(0);
}

mkdirSync(target, { recursive: true });

for (const folder of ['kolicons', 'codicons']) {
	const from = resolve(source, folder);
	if (existsSync(from)) {
		cpSync(from, resolve(target, folder), { recursive: true });
		console.log(`[copy-icons] ${folder} → public/${folder}`);
	}
}
