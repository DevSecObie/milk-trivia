import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import fs from 'node:fs'

let _env = null

export async function getTestEnv() {
  if (_env) return _env
  _env = await initializeTestEnvironment({
    projectId: 'demo-milk-trivia',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8765,
    },
  })
  return _env
}

export async function resetTestEnv() {
  if (!_env) return
  await _env.clearFirestore()
}

export async function teardown() {
  if (_env) {
    await _env.cleanup()
    _env = null
  }
}

// Convenience: get a Firestore client authed as `uid`, or unauthed.
export function dbAs(env, uid) {
  return uid ? env.authenticatedContext(uid).firestore()
             : env.unauthenticatedContext().firestore()
}

// Convenience: write seed data bypassing rules.
export async function seed(env, fn) {
  await env.withSecurityRulesDisabled(async ctx => {
    await fn(ctx.firestore())
  })
}
