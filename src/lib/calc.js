export function computePnl(entryPrice, exitPrice, qty) {
  const p = (Number(exitPrice) - Number(entryPrice)) * Number(qty)
  return Math.round(p * 100) / 100
}

export function fmtMoney(n) {
  const v = Number(n) || 0
  const sign = v < 0 ? '-' : ''
  return sign + '\u20b9' + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtNum(n) {
  return Number(n).toLocaleString('en-IN')
}

export function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset()
  const local = new Date(d.getTime() - tz * 60000)
  return local.toISOString().slice(0, 10)
}

// Deterministic small color set for group-link badges, derived from groupId.
const GROUP_COLORS = ['#E8A33D', '#5DA9E9', '#C77DFF', '#4CAF6D', '#E1594C', '#6FD3C7']
export function groupColor(groupId) {
  let h = 0
  for (let i = 0; i < groupId.length; i++) h = (h * 31 + groupId.charCodeAt(i)) >>> 0
  return GROUP_COLORS[h % GROUP_COLORS.length]
}

export function groupTag(groupId) {
  return groupId ? groupId.slice(-4).toUpperCase() : ''
}
