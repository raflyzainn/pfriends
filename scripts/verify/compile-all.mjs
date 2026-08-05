/**
 * Verifikasi statis: mengkompilasi SELURUH file .svelte di src/ memakai
 * compiler Svelte 5 secara langsung.
 *
 * Menangkap: error sintaks template, penyalahgunaan rune ($state/$derived/$props),
 * snippet yang tidak ditutup, atribut tidak valid, dan warning aksesibilitas.
 *
 * Jalankan: node scripts/verify/compile-all.mjs
 */

import { compile } from 'svelte/compiler';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) return walk(full);
			return entry.name.endsWith('.svelte') ? [full] : [];
		})
	);
	return files.flat();
}

const files = (await walk(SRC)).sort();

let failed = 0;
let totalWarnings = 0;
/** @type {{file: string, code: string, message: string}[]} */
const warningList = [];

for (const file of files) {
	const rel = relative(ROOT, file);
	try {
		const { warnings } = compile(readFileSync(file, 'utf8'), {
			filename: rel,
			generate: 'client'
		});
		totalWarnings += warnings.length;
		for (const w of warnings) {
			warningList.push({ file: rel, code: w.code ?? '', message: w.message ?? '' });
		}
	} catch (error) {
		failed++;
		console.error(`\n✗ ${rel}`);
		console.error(`  ${error.message}`);
		if (error.start) console.error(`  baris ${error.start.line}, kolom ${error.start.column}`);
	}
}

// Warning aksesibilitas dan sejenisnya dikelompokkan agar mudah ditindaklanjuti.
const byCode = warningList.reduce((acc, w) => {
	acc[w.code] = (acc[w.code] ?? 0) + 1;
	return acc;
}, /** @type {Record<string, number>} */ ({}));

console.log(`\n${'='.repeat(60)}`);
console.log(`Komponen dikompilasi : ${files.length}`);
console.log(`Gagal kompilasi      : ${failed}`);
console.log(`Total warning        : ${totalWarnings}`);
if (Object.keys(byCode).length > 0) {
	console.log('\nWarning per kode:');
	for (const [code, count] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${String(count).padStart(4)}  ${code}`);
	}
	if (warningList.length > 0) {
		console.log('\nContoh warning:');
		for (const w of warningList.slice(0, 15)) {
			console.log(`  ${w.file}: [${w.code}] ${w.message}`);
		}
	}
}
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
