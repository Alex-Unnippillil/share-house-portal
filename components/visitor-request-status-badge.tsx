import { Badge, type BadgeProps } from '@/components/ui/badge'

const STATUS_VARIANTS: Record<string, BadgeProps['variant']> = {
  pending: 'outline',
  approved: 'complete',
  denied: 'destructive',
}

function toTitleCase(value: string): string {
  if (!value) return ''
  return value
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function VisitorRequestStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const normalized = status?.toLowerCase() ?? ''
  const variant = STATUS_VARIANTS[normalized] ?? 'secondary'
  const label = normalized ? toTitleCase(normalized) : 'Unknown'

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
