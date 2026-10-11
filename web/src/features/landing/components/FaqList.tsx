import { Icon } from '@/components/ui/Icon'

export interface FaqItem {
  question: string
  answer: string
}

/** Native <details> accordion: keyboard and screen-reader friendly with no state to manage. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="marketing-faq-list flex w-full flex-col gap-space-sm">
      {items.map((item) => (
        <details key={item.question} className="group rounded-xl bg-surface-container-lowest shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-space-md p-space-lg text-title-md font-semibold text-on-surface [&::-webkit-details-marker]:hidden">
            {item.question}
            <Icon
              name="expand_more"
              size={22}
              className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="px-space-lg pb-space-lg text-body-md text-on-surface-variant">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
