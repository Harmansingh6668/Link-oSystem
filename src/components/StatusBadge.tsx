import type { Status } from '../lib/types'

export function StatusBadge({ status }: { status: Status }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        isActive
          ? 'bg-success/10 text-success ring-success/30'
          : 'bg-text-muted/10 text-text-muted ring-text-muted/20'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-text-muted'}`} />
      {isActive ? 'ACTIVE' : 'PAUSED'}
    </span>
  )
}
