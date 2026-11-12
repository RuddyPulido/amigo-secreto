import type { LucideIcon } from 'lucide-react'

export interface NavItem<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

interface BottomNavProps<T extends string> {
  items: readonly NavItem<T>[]
  value: T
  onChange: (value: T) => void
}

export function BottomNav<T extends string>({ items, value, onChange }: BottomNavProps<T>) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-forest/10 bg-cream/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon
          const active = value === item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.id)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                active
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-ink/55 hover:bg-forest/5 hover:text-forest'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
