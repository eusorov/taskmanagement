// Saves the backend's OpenAPI spec, pretty-printed so diffs stay readable.
// Usage: npm run api:fetch (backend running on localhost:8080, or set OPENAPI_URL)
import { writeFile } from 'node:fs/promises'

const url = process.env.OPENAPI_URL ?? 'http://localhost:8080/v3/api-docs'
const response = await fetch(url)
if (!response.ok) {
  throw new Error(`GET ${url} failed with ${response.status}`)
}
await writeFile('openapi.json', JSON.stringify(await response.json(), null, 2) + '\n')
console.log(`Saved openapi.json from ${url}`)
