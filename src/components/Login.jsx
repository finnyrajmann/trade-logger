export default function Login({ onSignIn, busy }) {
  return (
    <div className="login-screen">
      <div className="login-mark">
        Trade<span className="tick">Log</span>
      </div>
      <p>
        Entries, exits, and to-dos — synced straight to a Google Sheet in your own
        Drive. Nothing is stored anywhere else.
      </p>
      <button className="google-btn" onClick={onSignIn} disabled={busy}>
        {busy ? <span className="spinner" /> : null}
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  )
}
