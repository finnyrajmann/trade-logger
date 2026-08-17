import { useState } from 'react'
import { todayISO } from '../lib/calc'

export default function ExitModal({ trade, onClose, onSubmit }) {
  const [exitPrice, setExitPrice] = useState('')
  const [exitQty, setExitQty] = useState(String(trade.openQty))
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const qty = Number(exitQty)
    if (!exitPrice || Number(exitPrice) <= 0) return setError('Enter a valid exit price.')
    if (!qty || qty <= 0) return setError('Enter a valid quantity.')
    if (qty > Number(trade.openQty)) return setError(`Only ${trade.openQty} open on this entry.`)
    setError('')
    setBusy(true)
    try {
      await onSubmit({ exitPrice: Number(exitPrice), exitQty: qty, date })
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  const isPartial = Number(exitQty) < Number(trade.openQty)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Mark exit — {trade.symbol}</div>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Exit price</label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Quantity (open: {trade.openQty})</label>
          <input
            type="number"
            inputMode="numeric"
            value={exitQty}
            onChange={(e) => setExitQty(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {isPartial && (
          <div className="form-error" style={{ color: 'var(--accent)' }}>
            Partial exit — {Number(trade.openQty) - Number(exitQty || 0)} will stay open.
          </div>
        )}
        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Confirm exit'}
          </button>
        </div>
      </div>
    </div>
  )
}
