// Public OAuth Client ID — safe to expose in frontend code (this is how
// Google's browser-based OAuth flow works; there is no client secret here).
export const GOOGLE_CLIENT_ID =
  '1060043385064-vqasepolj9qugcbr1bltgg4ai0qt6v7u.apps.googleusercontent.com'

// drive.file: app can only see/create files it created itself (not your whole Drive).
// openid/email/profile: needed so the app can fetch your basic profile (name, email)
// to show who's signed in — this is what was missing, causing the 401 on userinfo.
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

export const SPREADSHEET_NAME = 'TradeLoggerData'

// Must exactly match an "Authorized redirect URI" on the OAuth client.
export const GOOGLE_REDIRECT_URI = 'https://finnyrajmann.github.io/trade-logger/'

export const SHEET_TRADES = 'Trades'
export const SHEET_TODOS = 'Todos'
export const SHEET_CATEGORIES = 'Categories'

export const TRADES_HEADERS = [
  'id', 'groupId', 'symbol', 'entryPrice', 'entryDate',
  'openQty', 'exitPrice', 'exitQty', 'exitDate', 'pnl', 'status',
]

export const TODOS_HEADERS = ['id', 'categoryId', 'text', 'done', 'createdDate']

export const CATEGORIES_HEADERS = ['id', 'name']

export const LS_SPREADSHEET_ID_PREFIX = 'tradelogger:spreadsheetId:'
