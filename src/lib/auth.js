// Redirect-based OAuth (no popup, no third-party-cookie dependency).
// Sign-in navigates the whole page to Google and back with the token in the
// URL fragment — this works even in privacy-hardened browsers that block the
// popup postMessage relay Google's other SDK relies on.

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, GOOGLE_REDIRECT_URI } from './config'

const LS_AUTH_KEY = 'tradelogger:auth' // { access_token, expires_at, profile }

function saveSession(access_token, expires_in, profile) {
  const session = {
    access_token,
    expires_at: Date.now() + (Number(expires_in) || 3500) * 1000,
    profile,
  }
  localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session))
  return session
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearSession() {
  localStorage.removeItem(LS_AUTH_KEY)
}

function buildAuthUrl(prompt) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'token',
    scope: GOOGLE_SCOPES,
    include_granted_scopes: 'true',
    prompt,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function fetchProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

// Call once on app load, before rendering. If the URL contains a fresh token
// (we just came back from Google), it's captured, saved, and the hash is
// stripped from the address bar.
async function captureRedirectToken() {
  if (!window.location.hash.includes('access_token')) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('access_token')
  const expiresIn = params.get('expires_in')
  const error = params.get('error')

  // Clean the sensitive fragment out of the URL/history either way.
  const clean = window.location.origin + window.location.pathname
  window.history.replaceState({}, document.title, clean)

  if (error || !accessToken) return null

  const profile = await fetchProfile(accessToken)
  return saveSession(accessToken, expiresIn, profile)
}

// Interactive sign-in: navigates away from the app to Google's consent page.
export function signIn() {
  window.location.href = buildAuthUrl('consent')
  // Execution stops here (full navigation) — nothing to return.
}

export function signOut() {
  const session = loadSession()
  clearSession()
  if (session?.access_token) {
    // Best-effort revoke; ignore failures.
    fetch(`https://oauth2.googleapis.com/revoke?token=${session.access_token}`, {
      method: 'POST',
    }).catch(() => {})
  }
}

export async function getAccessToken() {
  const session = loadSession()
  if (session && session.expires_at - Date.now() > 60_000) {
    return session.access_token
  }
  throw new Error('NEED_SIGN_IN')
}

// Called once on app load. Resolves to a profile if the user is signed in
// (either just redirected back from Google, or a still-valid saved session),
// otherwise null — never hangs, no silent network round trip required.
export async function tryRestoreSession() {
  const fromRedirect = await captureRedirectToken()
  if (fromRedirect) return fromRedirect.profile

  const session = loadSession()
  if (session && session.expires_at - Date.now() > 60_000) {
    return session.profile
  }
  return null
}
