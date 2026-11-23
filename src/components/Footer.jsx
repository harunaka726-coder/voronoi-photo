import { useI18n } from '../i18n'
import AdSlot from './AdSlot'

export const PRIVACY_URL =
  'https://harunaka726-coder.github.io/voronoi-photo-privacy/'

export default function Footer({ showAd = false }) {
  const { t, contactUrl } = useI18n()

  return (
    <footer className="mt-auto shrink-0 border-t border-line/80 bg-[#FAF9F6]">
      {showAd && (
        <div className="w-full py-1.5 md:py-3">
          <AdSlot />
        </div>
      )}
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-center gap-x-2 overflow-x-auto whitespace-nowrap px-3 py-2 text-[11px] text-muted sm:gap-x-3 sm:px-6 sm:text-sm lg:px-8">
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 transition hover:text-ink"
        >
          {t.privacy}
        </a>
        <span aria-hidden="true" className="shrink-0 text-line">
          ·
        </span>
        <a
          href={contactUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 transition hover:text-ink"
        >
          {t.contact}
        </a>
        <span aria-hidden="true" className="shrink-0 text-line">
          ·
        </span>
        <a
          href="https://harunakajima.com/"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 transition hover:text-ink"
        >
          {t.otherWorks}
        </a>
      </div>
    </footer>
  )
}
