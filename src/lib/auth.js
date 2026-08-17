import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config'

let tokenClient = null
let currentToken = null // { access_token, expires_at }
let currentProfile = null // { email, name, picture }

function waitForGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    let tries = 0
    const iv = setInterval(() => {
      tries += 1
      if (window.google?.accounts?.oauth2) {
        clearInterval(iv)
        resolve()
      } else if (tries > 100) {
        clearInterval(iv)
        reject(new Error('Google Identity Services failed to load'))
      }
    }, 100)
  })
}

async function ensureTokenClient() {
  await waitForGis()
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: () => {}, // overridden per-request below
    })
  }
  return tokenClient
}

async function fetchProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

// Interactive sign-in (shows Google popup). Call from a click handler.
export async function signIn() {
  const client = await ensureTokenClient()
  const token = await new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error))
      resolve(resp)
    }
    client.requestAccessToken({ prompt: 'consent' })
  })
  currentToken = {
    access_token: token.access_token,
    expires_at: Date.now() + (Number(token.expires_in) || 3500) * 1000,
  }
  currentProfile = await fetchProfile(currentToken.access_token)
  return currentProfile
}

// Silent refresh, no popup if already consented. Falls back to null on failure.
async function silentRefresh() {
  try {
    const client = await ensureTokenClient()
    const token = await new Promise((resolve, reject) => {
      client.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error))
        resolve(resp)
      }
      client.requestAccessToken({ prompt: '' })
    })
    currentToken = {
      access_token: token.access_token,
      expires_at: Date.now() + (Number(token.expires_in) || 3500) * 1000,
    }
    return currentToken.access_token
  } catch {
    return null
  }
}

export async function getAccessToken() {
  if (currentToken && currentToken.expires_at - Date.now() > 60_000) {
    return currentToken.access_token
  }
  const refreshed = await silentRefresh()
  if (!refreshed) throw new Error('NEED_SIGN_IN')
  return refreshed
}

export function getProfile() {
  return currentProfile
}

export function signOut() {
  if (currentToken?.access_token && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(currentToken.access_token, () => {})
  }
  currentToken = null
  currentProfile = null
}

export async function tryRestoreSession() {
  // Attempt a silent token grab (works if the browser still has an active
  // Google session and the user previously granted consent).
  const token = await silentRefresh()
  if (!token) return null
  currentProfile = await fetchProfile(token)
  return currentProfile
}
