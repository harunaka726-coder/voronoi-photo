import { useI18n } from '../i18n'

export default function HowToModal({ open, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2C2C]/45 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="howto-title"
    >
      <div className="w-full max-w-md rounded-sm bg-[#FAF9F6] p-6 shadow-[0_24px_60px_-20px_rgba(44,44,44,0.45)] ring-1 ring-black/5">
        <h2 id="howto-title" className="font-display text-2xl font-semibold text-ink">
          {t.welcomeTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t.welcomeBody}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink">
          {t.guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-[#FAF9F6] transition hover:bg-black"
        >
          {t.gotIt}
        </button>
      </div>
    </div>
  )
}
