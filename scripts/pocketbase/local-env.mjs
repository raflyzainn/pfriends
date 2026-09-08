import { readFile } from 'node:fs/promises';

export async function loadLocalEnv() {
	try {
		const source = await readFile(new URL('../../.env', import.meta.url), 'utf8');
		const values = Object.fromEntries(
			source
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith('#') && line.includes('='))
				.map((line) => {
					const index = line.indexOf('=');
					const key = line.slice(0, index).trim();
					const value = line.slice(index + 1).trim().replace(/^(?:"(.*)"|'(.*)')$/, '$1$2');
					return [key, value];
				})
		);

		// Variabel yang diberikan langsung melalui terminal tetap memiliki prioritas.
		Object.assign(process.env, { ...values, ...process.env });
		return values;
	} catch (error) {
		if (error?.code === 'ENOENT') return {};
		throw error;
	}
}
