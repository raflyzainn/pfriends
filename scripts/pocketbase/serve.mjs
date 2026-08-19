import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv } from './local-env.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const executable = fileURLToPath(new URL('../../pocketbase/pocketbase.exe', import.meta.url));

await loadLocalEnv();

const child = spawn(
	executable,
	[
		'serve',
		'--dir=pocketbase/pb_data',
		'--migrationsDir=pocketbase/pb_migrations',
		'--hooksDir=pocketbase/pb_hooks'
	],
	{
		cwd: projectRoot,
		env: process.env,
		stdio: 'inherit'
	}
);

child.once('error', (error) => {
	console.error(`PocketBase gagal dijalankan: ${error.message}`);
	process.exitCode = 1;
});

child.once('exit', (code) => {
	process.exitCode = code ?? 1;
});
