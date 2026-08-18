import { useMemo, useState } from 'react'
import { fmtMoney, fmtNum, groupColor, daysBetween, todayISO } from '../lib/calc'
import AddTradeModal from './AddTradeModal'
import ExitModal from './ExitModal'

const OPEN_COLS = '78px 72px 56px 84px 60px 128px'
const CLOSED_COLS = '78px 72px 72px 56px 84px 84px 52px 90px'

export default function TradesTab({ trades, onAddEntry, onMarkExit, onDeleteOpen }) {
  const [showAdd, setShowAdd] = useState(false)
  const [exitTarget, setExitTarget] = useState(null)

  const open = useMemo(
    () => trades.filter((t) => t.status === 'OPEN').sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1)),
    [trades]
  )
  const closed = useMemo(
    () => trades.filter((t) => t.status === 'CLOSED').sort((a, b) => (a.exitDate < b.exitDate ? 1 : -1)),
    [trades]
  )

  const groupCounts = useMemo(() => {
    const m = {}
    for (const t of trades) m[t.groupId] = (m[t.groupId] || 0) + 1
    return m
  }, [trades])

  const closedWithDays = useMemo(
    () => closed.map((t) => ({ ...t, _days: daysBetween(t.entryDate, t.exitDate) })),
    [closed]
  )

  const totalPnl = useMemo(
    () => closedWithDays.reduce((s, t) => s + (Number(t.pnl) || 0), 0),
    [closedWithDays]
  )
  const avgDays = useMemo(() => {
    const withDays = closedWithDays.filter((t) => t._days !== null)
    if (!withDays.length) return null
    return Math.round(withDays.reduce((s, t) => s + t._days, 0) / withDays.length)
  }, [closedWithDays])

  return (
    <>
      <div className="section-label">
        <span>Open positions</span>
        <span>{open.length}</span>
      </div>
      {open.length === 0 ? (
        <div className="empty-state">No open positions. Tap + to add an entry.</div>
      ) : (
        <div className="trade-table-wrap">
          <div className="trade-row trade-header-row" style={{ gridTemplateColumns: OPEN_COLS }}>
            <span>Symbol</span>
            <span>Entry</span>
            <span>Qty</span>
            <span>Entry date</span>
            <span>Days</span>
            <span>Actions</span>
          </div>
          {open.map((t) => (
            <OpenRow
              key={t.id}
              t={t}
              linked={groupCounts[t.groupId] > 1}
              onMarkExit={() => setExitTarget(t)}
              onDelete={() => onDeleteOpen(t)}
            />
          ))}
        </div>
      )}

      <div className="section-label" style={{ marginTop: 22 }}>
        <span>Closed trades</span>
        <span>{closed.length}</span>
      </div>
      {closed.length === 0 ? (
        <div className="empty-state">Closed trades will show up here, locked from editing.</div>
      ) : (
        <div className="trade-table-wrap">
          <div className="trade-row trade-header-row" style={{ gridTemplateColumns: CLOSED_COLS }}>
            <span>Symbol</span>
            <span>Entry</span>
            <span>Exit</span>
            <span>Qty</span>
            <span>Entry date</span>
            <span>Exit date</span>
            <span>Days</span>
            <span>P&amp;L</span>
          </div>
          {closedWithDays.map((t) => (
            <ClosedRow key={t.id} t={t} linked={groupCounts[t.groupId] > 1} />
          ))}
          <div className="trade-row trade-footer-row" style={{ gridTemplateColumns: CLOSED_COLS }}>
            <span style={{ gridColumn: '1 / 7' }}>TOTAL / AVG</span>
            <span>{avgDays === null ? '—' : `${avgDays}d`}</span>
            <span className={totalPnl >= 0 ? 'pnl-value gain' : 'pnl-value loss'}>{fmtMoney(totalPnl)}</span>
          </div>
        </div>
      )}

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add entry">＋</button>

      {showAdd && (
        <AddTradeModal
          onClose={() => setShowAdd(false)}
          onSubmit={async (data) => {
            await onAddEntry(data)
            setShowAdd(false)
          }}
        />
      )}

      {exitTarget && (
        <ExitModal
          trade={exitTarget}
          onClose={() => setExitTarget(null)}
          onSubmit={async (data) => {
            await onMarkExit(exitTarget, data)
            setExitTarget(null)
          }}
        />
      )}
    </>
  )
}

function OpenRow({ t, linked, onMarkExit, onDelete }) {
  const daysOpen = daysBetween(t.entryDate, todayISO())
  return (
    <div className="trade-row" style={{ gridTemplateColumns: OPEN_COLS }}>
      <span className="cell-symbol">
        {linked && <span className="group-dot" style={{ background: groupColor(t.groupId) }} />}
        {t.symbol}
      </span>
      <span>₹{t.entryPrice}</span>
      <span>{fmtNum(t.openQty)}</span>
      <span className="cell-muted">{t.entryDate}</span>
      <span className="cell-muted">{daysOpen === null ? '—' : `${daysOpen}d`}</span>
      <span className="trade-actions-cell">
        <button className="icon-action-btn primary" onClick={onMarkExit}>Exit</button>
        <button className="icon-action-btn danger" onClick={onDelete}>Del</button>
      </span>
    </div>
  )
}

function ClosedRow({ t, linked }) {
  const pnl = Number(t.pnl) || 0
  return (
    <div className="trade-row closed" style={{ gridTemplateColumns: CLOSED_COLS }}>
      <span className="cell-symbol">
        {linked && <span className="group-dot" style={{ background: groupColor(t.groupId) }} />}
        {t.symbol}
      </span>
      <span>₹{t.entryPrice}</span>
      <span>₹{t.exitPrice}</span>
      <span>{fmtNum(t.exitQty)}</span>
      <span className="cell-muted">{t.entryDate}</span>
      <span className="cell-muted">{t.exitDate}</span>
      <span className="cell-muted">{t._days === null ? '—' : `${t._days}d`}</span>
      <span className={pnl >= 0 ? 'pnl-value gain' : 'pnl-value loss'}>{fmtMoney(pnl)}</span>
    </div>
  )
}
