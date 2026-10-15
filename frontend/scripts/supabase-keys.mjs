// Creates the local JWT signing key that supabase/config.toml points to (supabase/signing_keys.json, git-ignored).
// Local development only: production keys live in the Supabase project, never in the repository.
// Usage: npm run supabase:keys   (once per machine, before npm run supabase:start)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const file = fileURLToPath(new URL('../../supabase/signing_keys.json', import.meta.url));

if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).length > 0) {
  console.log('supabase/signing_keys.json already has a key; nothing to do.');
  process.exit(0);
}
// The CLI appends to an existing file only.
writeFileSync(file, '[]\n');
const cli = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url));
const result = spawnSync(cli, ['gen', 'signing-key', '--algorithm', 'ES256', '--append'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
