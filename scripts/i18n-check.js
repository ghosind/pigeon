#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`Failed to parse ${file}:`, e.message)
    process.exit(2)
  }
}

const dir = process.argv[2] || path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
if (files.length === 0) {
  console.error('No JSON files found in', dir)
  process.exit(2)
}

const maps = {}
for (const f of files) {
  const p = path.join(dir, f)
  maps[f] = readJson(p)
}

// gather union of keys
const allKeys = new Set()
for (const m of Object.values(maps)) for (const k of Object.keys(m)) allKeys.add(k)

let missing = false
for (const [fname, m] of Object.entries(maps)) {
  const missingKeys = [...allKeys].filter((k) => !(k in m))
  if (missingKeys.length) {
    missing = true
    console.error(`\nMissing keys in ${fname}:`)
    for (const k of missingKeys) console.error('  ', k)
  }
}

if (missing) {
  console.error('\nTranslation validation failed')
  process.exit(1)
}

console.log('All translation JSON files have consistent keys.')
process.exit(0)
