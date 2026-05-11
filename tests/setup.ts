import 'dotenv/config'
import { config } from 'dotenv'
import path from 'node:path'

// Load .env.local in addition to .env (Next-style precedence).
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
