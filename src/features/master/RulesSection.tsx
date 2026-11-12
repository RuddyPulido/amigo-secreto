import { HandHeart } from 'lucide-react'
import { Switch } from '../../components/Switch'
import { cardClass, sectionTitleClass } from '../../components/ui'

interface RulesSectionProps {
  allowSameFamily: boolean
  onlyChildrenDrawChildren: boolean
  onChangeAllowSameFamily: (allow: boolean) => void
  onChangeOnlyChildrenDrawChildren: (value: boolean) => void
}

export function RulesSection({
  allowSameFamily,
  onlyChildrenDrawChildren,
  onChangeAllowSameFamily,
  onChangeOnlyChildrenDrawChildren,
}: RulesSectionProps) {
  return (
    <section className={cardClass}>
      <div className="flex items-center gap-2">
        <HandHeart className="h-5 w-5 text-forest" aria-hidden="true" />
        <h2 className={sectionTitleClass}>Regras do sorteio</h2>
      </div>

      <div className="mt-4 space-y-4">
        <Switch
          checked={allowSameFamily}
          onChange={onChangeAllowSameFamily}
          label="Permitir sorteio entre familiares"
          description={
            allowSameFamily
              ? 'Ligado: pessoas da mesma família podem se sortear. Ninguém pode sortear a si mesmo.'
              : 'Desligado: ninguém pode sortear alguém da própria família.'
          }
        />

        <div className="border-t border-forest/10 pt-4">
          <Switch
            checked={onlyChildrenDrawChildren}
            onChange={onChangeOnlyChildrenDrawChildren}
            label="Criança apenas sorteia criança"
            description={
              onlyChildrenDrawChildren
                ? 'Ligado: crianças sorteiam apenas crianças e adultos apenas adultos.'
                : 'Desligado: a idade não restringe o sorteio.'
            }
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink/45">
        O sorteio sempre fecha: cada pessoa sorteia uma vez e todos são sorteados
        exatamente uma vez.
      </p>
    </section>
  )
}
