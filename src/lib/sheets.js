import { getAccessToken } from './auth'
import {
  SPREADSHEET_NAME,
  SHEET_TRADES,
  SHEET_TODOS,
  SHEET_CATEGORIES,
  TRADES_HEADERS,
  TODOS_HEADERS,
  CATEGORIES_HEADERS,
  LS_SPREADSHEET_ID_PREFIX,
} from './config'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files'

async function authFetch(url, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text.slice(0, 300)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function lsKey(email) {
  return LS_SPREADSHEET_ID_PREFIX + email
}

async function findExistingSpreadsheet() {
  const q = encodeURIComponent(
    `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )
  const data = await authFetch(`${DRIVE_BASE}?q=${q}&fields=files(id,name)&spaces=drive`)
  return data.files?.[0]?.id || null
}

async function createSpreadsheet() {
  const body = {
    properties: { title: SPREADSHEET_NAME },
    sheets: [
      { properties: { title: SHEET_TRADES } },
      { properties: { title: SHEET_TODOS } },
      { properties: { title: SHEET_CATEGORIES } },
    ],
  }
  const created = await authFetch(SHEETS_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const id = created.spreadsheetId

  // Seed headers
  await authFetch(`${SHEETS_BASE}/${id}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_TRADES}!A1`, values: [TRADES_HEADERS] },
        { range: `${SHEET_TODOS}!A1`, values: [TODOS_HEADERS] },
        { range: `${SHEET_CATEGORIES}!A1`, values: [CATEGORIES_HEADERS] },
      ],
    }),
  })

  // Seed a default "General" category
  await authFetch(`${SHEETS_BASE}/${id}/values/${SHEET_CATEGORIES}!A2:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[cryptoId(), 'General']] }),
  })

  return id
}

function cryptoId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}
export { cryptoId as genId }

// Resolves (and caches) the spreadsheet ID for the signed-in user.
export async function ensureSpreadsheet(email) {
  const cached = localStorage.getItem(lsKey(email))
  if (cached) {
    try {
      await authFetch(`${SHEETS_BASE}/${cached}?fields=spreadsheetId`)
      return cached
    } catch {
      localStorage.removeItem(lsKey(email))
    }
  }
  const found = await findExistingSpreadsheet()
  if (found) {
    localStorage.setItem(lsKey(email), found)
    return found
  }
  const created = await createSpreadsheet()
  localStorage.setItem(lsKey(email), created)
  return created
}

export async function getSheetIdMap(spreadsheetId) {
  const data = await authFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`)
  const map = {}
  for (const s of data.sheets) map[s.properties.title] = s.properties.sheetId
  return map
}

export async function fetchAllData(spreadsheetId) {
  const ranges = [SHEET_TRADES, SHEET_TODOS, SHEET_CATEGORIES]
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')
  // UNFORMATTED_VALUE: without this, Sheets returns numbers as *display*
  // strings (e.g. "1,234.50" for a stock over Rs.1,000), which breaks Number()
  // parsing everywhere downstream. This returns the real underlying numbers.
  const data = await authFetch(
    `${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`
  )
  const [trades, todos, categories] = data.valueRanges.map((vr) => vr.values || [])
  return {
    trades: rowsToObjects(trades, TRADES_HEADERS),
    todos: rowsToObjects(todos, TODOS_HEADERS),
    categories: rowsToObjects(categories, CATEGORIES_HEADERS),
  }
}

function rowsToObjects(rows, headers) {
  if (!rows || rows.length < 2) return []
  const [, ...body] = rows
  return body.map((row, i) => {
    const obj = { _row: i + 2 } // sheet row number (1-indexed, +1 for header)
    headers.forEach((h, idx) => (obj[h] = row[idx] ?? ''))
    return obj
  })
}

function objectToRow(obj, headers) {
  return headers.map((h) => (obj[h] === undefined || obj[h] === null ? '' : obj[h]))
}

export async function appendRow(spreadsheetId, sheetTitle, obj, headers) {
  await authFetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${sheetTitle}!A:A:append?valueInputOption=RAW`,
    { method: 'POST', body: JSON.stringify({ values: [objectToRow(obj, headers)] }) }
  )
}

export async function updateRow(spreadsheetId, sheetTitle, rowNumber, obj, headers) {
  const lastCol = String.fromCharCode(64 + headers.length) // A=1 -> assumes <=26 cols
  await authFetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${sheetTitle}!A${rowNumber}:${lastCol}${rowNumber}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [objectToRow(obj, headers)] }) }
  )
}

export async function deleteRow(spreadsheetId, sheetGid, rowNumber) {
  // rowNumber is 1-indexed sheet row; API deleteDimension is 0-indexed, end-exclusive.
  await authFetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetGid,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    }),
  })
}
