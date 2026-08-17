import { useState } from 'react'
import { todayISO } from '../lib/calc'

export default function AddTradeModal({ onClose, onSubmit }) {
  const [symbol, setSymbol] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!symbol.trim()) return setError('Enter a symbol.')
    if (!entryPrice || Number(entryPrice) <= 0) return setError('Enter a valid entry price.')
    if (!quantity || Number(quantity) <= 0) return setError('Enter a valid quantity.')
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        entryPrice: Number(entryPrice),
        quantity: Number(quantity),
        date,
      })
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">New entry</div>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Symbol</label>
          <input
            autoFocus
            placeholder="e.g. MARUTI"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div className="field">
          <label>Entry price</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Quantity</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Add entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
