import crypto from 'crypto'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || ''
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword()
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url')
}

function safeEqual(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function verifyAdminPassword(password) {
  const configuredPassword = getAdminPassword()
  if (!configuredPassword || !password) return false
  return safeEqual(String(password), configuredPassword)
}

export function createAdminToken() {
  const payload = base64Url(JSON.stringify({
    role: 'admin',
    exp: Date.now() + SESSION_TTL_MS,
  }))

  return `${payload}.${sign(payload)}`
}

export function verifyAdminToken(token) {
  if (!token || !getSessionSecret()) return false

  const [payload, signature] = String(token).split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data.role === 'admin' && Number(data.exp) > Date.now()
  } catch (error) {
    return false
  }
}

export function requireAdminAuth(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (verifyAdminToken(token)) return true

  res.status(401).json({ error: 'Unauthorized' })
  return false
}
