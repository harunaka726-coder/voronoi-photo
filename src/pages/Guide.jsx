import { useI18n } from '../i18n'

export default function Guide() {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t.guideTitle}
      </h1>
      <ol className="mt-8 space-y-4">
        {t.guideSteps.map((step, i) => (
          <li key={step} className="flex gap-4 border-b border-line pb-4 last:border-0">
            <span className="font-display text-2xl text-muted/70">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="pt-1 text-base leading-relaxed text-ink">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
