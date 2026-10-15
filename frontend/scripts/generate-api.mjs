// Generates the Angular API client (src/app/api, never edit by hand) from the backend's OpenAPI spec.
//   npm run api:generate            fetch the spec from the running API, save openapi/site-api.json, generate
//   npm run api:generate -- --offline   generate from the saved openapi/site-api.json (CI, no backend needed)
// API_SPEC_URL overrides the spec location (default http://localhost:8080/api/v3/api-docs).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SPEC_FILE = 'openapi/site-api.json';
const SPEC_URL = process.env.API_SPEC_URL ?? 'http://localhost:8080/api/v3/api-docs';
const offline = process.argv.includes('--offline');

if (!offline) {
  const response = await fetch(SPEC_URL).catch((error) => {
    console.error(`Cannot reach ${SPEC_URL}: ${error.message}\nStart the API (cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev') or use --offline.`);
    process.exit(1);
  });
  if (!response.ok) {
    console.error(`${SPEC_URL} answered ${response.status}`);
    process.exit(1);
  }
  const spec = await response.json();
  delete spec.servers; // the base URL is provided at runtime (API_BASE_URL), never baked into the client
  mkdirSync('openapi', { recursive: true });
  writeFileSync(SPEC_FILE, JSON.stringify(spec, null, 2) + '\n');
  console.log(`Saved ${SPEC_FILE} from ${SPEC_URL}`);
} else {
  JSON.parse(readFileSync(SPEC_FILE, 'utf8'));
  console.log(`Using the saved ${SPEC_FILE}`);
}

const properties = [
  'ngVersion=22.0.0',
  'providedIn=root',
  'fileNaming=kebab-case',
  'stringEnums=true',
  'useSingleRequestParameter=true',
  'supportsES6=true',
].join(',');

const result = spawnSync(
  'npx',
  ['openapi-generator-cli', 'generate', '-i', SPEC_FILE, '-g', 'typescript-angular', '-o', 'src/app/api', '--additional-properties', properties],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
