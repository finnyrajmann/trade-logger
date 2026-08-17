import { useEffect, useState, useCallback } from 'react'
import Login from './components/Login'
import TradesTab from './components/TradesTab'
import TodosTab from './components/TodosTab'
import {
  signIn as gSignIn,
  signOut as gSignOut,
  tryRestoreSession,
} from './lib/auth'
import {
  ensureSpreadsheet,
  getSheetIdMap,
  fetchAllData,
  appendRow,
  updateRow,
  deleteRow,
  genId,
} from './lib/sheets'
import {
  SHEET_TRADES,
  SHEET_TODOS,
  SHEET_CATEGORIES,
  TRADES_HEADERS,
  TODOS_HEADERS,
  CATEGORIES_HEADERS,
} from './lib/config'
import { computePnl, todayISO } from './lib/calc'

export default function App() {
  const [authState, setAuthState] = useState('checking') // checking | out | in
  const [profile, setProfile] = useState(null)
  const [spreadsheetId, setSpreadsheetId] = useState(null)
  const [sheetGids, setSheetGids] = useState({})
  const [tab, setTab] = useState('trades')
  const [data, setData] = useState({ trades: [], todos: [], categories: [] })
  const [loading, setLoading] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [toast, setToast] = useState(null)

  const flash = useCallback((msg, isError) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), isError ? 4000 : 2200)
  }, [])

  const bootstrap = useCallback(async (prof) => {
    setLoading(true)
    try {
      const id = await ensureSpreadsheet(prof.email)
      setSpreadsheetId(id)
      const gids = await getSheetIdMap(id)
      setSheetGids(gids)
      const all = await fetchAllData(id)
      setData(all)
    } catch (e) {
      if (e.message === 'NEED_SIGN_IN') {
        setAuthState('out')
      } else {
        flash(e.message || 'Failed to load your data.', true)
      }
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => {
    ;(async () => {
      const prof = await tryRestoreSession()
      if (prof) {
        setProfile(prof)
        setAuthState('in')
        await bootstrap(prof)
      } else {
        setAuthState('out')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSignIn() {
    setSigningIn(true)
    gSignIn() // navigates away to Google; app reloads on return
  }

  function handleSignOut() {
    gSignOut()
    setAuthState('out')
    setProfile(null)
    setSpreadsheetId(null)
    setData({ trades: [], todos: [], categories: [] })
  }

  const refresh = useCallback(async () => {
    if (!spreadsheetId) return
    const all = await fetchAllData(spreadsheetId)
    setData(all)
  }, [spreadsheetId])

  async function withRefresh(fn) {
    try {
      await fn()
      await refresh()
    } catch (e) {
      if (e.message === 'NEED_SIGN_IN') {
        flash('Session expired — please sign in again.', true)
        setAuthState('out')
      } else {
        flash(e.message || 'Something went wrong. Try again.', true)
      }
      throw e
    }
  }

  // ---------- Trades ----------

  async function handleAddEntry({ symbol, entryPrice, quantity, date }) {
    await withRefresh(async () => {
      const id = genId()
      await appendRow(spreadsheetId, SHEET_TRADES, {
        id,
        groupId: id,
        symbol,
        entryPrice,
        entryDate: date,
        openQty: quantity,
        exitPrice: '',
        exitQty: '',
        exitDate: '',
        pnl: '',
        status: 'OPEN',
      }, TRADES_HEADERS)
    })
    flash('Entry added')
  }

  async function handleMarkExit(trade, { exitPrice, exitQty, date }) {
    await withRefresh(async () => {
      const openQty = Number(trade.openQty)
      const pnl = computePnl(trade.entryPrice, exitPrice, exitQty)
      if (exitQty >= openQty) {
        await updateRow(spreadsheetId, SHEET_TRADES, trade._row, {
          ...trade,
          openQty: 0,
          exitPrice,
          exitQty,
          exitDate: date,
          pnl,
          status: 'CLOSED',
        }, TRADES_HEADERS)
      } else {
        await appendRow(spreadsheetId, SHEET_TRADES, {
          id: genId(),
          groupId: trade.groupId,
          symbol: trade.symbol,
          entryPrice: trade.entryPrice,
          entryDate: trade.entryDate,
          openQty: 0,
          exitPrice,
          exitQty,
          exitDate: date,
          pnl,
          status: 'CLOSED',
        }, TRADES_HEADERS)
        await updateRow(spreadsheetId, SHEET_TRADES, trade._row, {
          ...trade,
          openQty: openQty - exitQty,
        }, TRADES_HEADERS)
      }
    })
    flash('Exit recorded')
  }

  async function handleDeleteOpen(trade) {
    if (!confirm(`Delete open entry ${trade.symbol}? This can't be undone.`)) return
    await withRefresh(async () => {
      await deleteRow(spreadsheetId, sheetGids[SHEET_TRADES], trade._row)
    })
    flash('Entry deleted')
  }

  // ---------- Todos ----------

  async function handleAddCategory(name) {
    await withRefresh(async () => {
      await appendRow(spreadsheetId, SHEET_CATEGORIES, { id: genId(), name }, CATEGORIES_HEADERS)
    })
  }

  async function handleDeleteCategory(cat) {
    const items = data.todos.filter((t) => t.categoryId === cat.id)
    const msg = items.length
      ? `Remove "${cat.name}" and its ${items.length} item(s)?`
      : `Remove "${cat.name}"?`
    if (!confirm(msg)) return
    await withRefresh(async () => {
      const rows = items.map((t) => t._row).sort((a, b) => b - a)
      for (const r of rows) {
        await deleteRow(spreadsheetId, sheetGids[SHEET_TODOS], r)
      }
      await deleteRow(spreadsheetId, sheetGids[SHEET_CATEGORIES], cat._row)
    })
  }

  async function handleAddTodo(categoryId, text) {
    await withRefresh(async () => {
      await appendRow(spreadsheetId, SHEET_TODOS, {
        id: genId(),
        categoryId,
        text,
        done: 'false',
        createdDate: todayISO(),
      }, TODOS_HEADERS)
    })
  }

  async function handleToggleTodo(todo) {
    const isDone = todo.done === 'true' || todo.done === true
    await withRefresh(async () => {
      await updateRow(spreadsheetId, SHEET_TODOS, todo._row, {
        ...todo,
        done: isDone ? 'false' : 'true',
      }, TODOS_HEADERS)
    })
  }

  async function handleDeleteTodo(todo) {
    await withRefresh(async () => {
      await deleteRow(spreadsheetId, sheetGids[SHEET_TODOS], todo._row)
    })
  }

  // ---------- Render ----------

  if (authState === 'checking') {
    return (
      <div className="center-loading">
        <span className="spinner" /> Checking sign-in…
      </div>
    )
  }

  if (authState === 'out') {
    return <Login onSignIn={handleSignIn} busy={signingIn} />
  }

  const openCount = data.trades.filter((t) => t.status === 'OPEN').length

  return (
    <>
      <div className="app-header">
        <div className="app-title">
          <span className="dot" /> TradeLog
        </div>
        <div className="profile-chip">
          {profile?.picture && <img src={profile.picture} alt="" />}
          <span>{profile?.email?.split('@')[0]}</span>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div className="tabbar">
        <button className={tab === 'trades' ? 'active' : ''} onClick={() => setTab('trades')}>
          Trades{openCount > 0 && <span className="badge">{openCount}</span>}
        </button>
        <button className={tab === 'todos' ? 'active' : ''} onClick={() => setTab('todos')}>
          To-Dos
        </button>
      </div>

      <div className="content">
        {loading ? (
          <div className="center-loading"><span className="spinner" /> Loading…</div>
        ) : tab === 'trades' ? (
          <TradesTab
            trades={data.trades}
            onAddEntry={handleAddEntry}
            onMarkExit={handleMarkExit}
            onDeleteOpen={handleDeleteOpen}
          />
        ) : (
          <TodosTab
            categories={data.categories}
            todos={data.todos}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        )}
      </div>

      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}
    </>
  )
}
