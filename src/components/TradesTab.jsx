import { useMemo, useState } from 'react'
import { fmtMoney, fmtNum, groupColor, groupTag } from '../lib/calc'
import AddTradeModal from './AddTradeModal'
import ExitModal from './ExitModal'

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

  const totalPnl = useMemo(
    () => closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0),
    [closed]
  )

  return (
    <>
      <div className="section-label">
        <span>Open positions</span>
        <span>{open.length}</span>
      </div>
      {open.length === 0 && <div className="empty-state">No open positions. Tap + to add an entry.</div>}
      {open.map((t) => (
        <TradeCard
          key={t.id}
          t={t}
          linked={groupCounts[t.groupId] > 1}
          onMarkExit={() => setExitTarget(t)}
          onDelete={() => onDeleteOpen(t)}
        />
      ))}

      <div className="section-label" style={{ marginTop: 22 }}>
        <span>Closed trades</span>
        <span>{closed.length}</span>
      </div>
      {closed.length === 0 && <div className="empty-state">Closed trades will show up here, locked from editing.</div>}
      {closed.map((t) => (
        <TradeCard key={t.id} t={t} linked={groupCounts[t.groupId] > 1} closed />
      ))}

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add entry">＋</button>

      <div className="ticker-bar">
        <span className="label">Total P&amp;L (closed)</span>
        <span className="value" style={{ color: totalPnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
          {fmtMoney(totalPnl)}
        </span>
      </div>

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

function TradeCard({ t, linked, closed, onMarkExit, onDelete }) {
  const pnl = Number(t.pnl) || 0
  return (
    <div className={`card ${closed ? 'closed' : ''}`}>
      <div className="card-top">
        <div className="symbol">
          {t.symbol}
          {linked && (
            <span
              className="group-tag"
              style={{ background: groupColor(t.groupId) + '22', color: groupColor(t.groupId) }}
              title="Part of a multi-exit entry"
            >
              #{groupTag(t.groupId)}
            </span>
          )}
        </div>
        <span className={`pill ${closed ? 'closed' : 'open'}`}>{closed ? 'Closed' : 'Open'}</span>
      </div>

      <div className="card-grid">
        <div>
          <div className="field-label">Entry</div>
          <div className="field-value">₹{t.entryPrice}</div>
        </div>
        <div>
          <div className="field-label">{closed ? 'Exit qty' : 'Open qty'}</div>
          <div className="field-value">{fmtNum(closed ? t.exitQty : t.openQty)}</div>
        </div>
        <div>
          <div className="field-label">{closed ? 'Exit' : 'Entry date'}</div>
          <div className="field-value">{closed ? `₹${t.exitPrice}` : t.entryDate}</div>
        </div>
      </div>

      {closed && (
        <div className="card-grid" style={{ marginTop: 8 }}>
          <div>
            <div className="field-label">Exit date</div>
            <div className="field-value">{t.exitDate}</div>
          </div>
          <div>
            <div className="field-label">P&amp;L</div>
            <div className={`field-value pnl-value ${pnl >= 0 ? 'gain' : 'loss'}`}>{fmtMoney(pnl)}</div>
          </div>
          <div />
        </div>
      )}

      {!closed && (
        <div className="card-actions">
          <button className="danger" onClick={onDelete}>Delete</button>
          <button className="primary" onClick={onMarkExit}>Mark exit</button>
        </div>
      )}

      {linked && (
        <div className="link-strip">
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: groupColor(t.groupId), display: 'inline-block',
            }}
          />
          Linked to other exits from this same entry
        </div>
      )}
    </div>
  )
}
