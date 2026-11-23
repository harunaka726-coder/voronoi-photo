import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LANGS, useI18n } from '../i18n'

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function HamburgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

const linkClass = ({ isActive }) =>
  `text-sm transition ${
    isActive ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
  }`

export default function Header() {
  const { t, lang, isAuto, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const pageLinks = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
        {t.navHome}
      </NavLink>
      <NavLink to="/album" className={linkClass} onClick={() => setOpen(false)}>
        {t.navAlbum}
      </NavLink>
      <NavLink to="/guide" className={linkClass} onClick={() => setOpen(false)}>
        {t.navGuide}
      </NavLink>
    </>
  )

  const langMenu = (
    <div className="relative" ref={langRef}>
      <button
        type="button"
        onClick={() => setLangOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        aria-haspopup="listbox"
        aria-expanded={langOpen}
      >
        <GlobeIcon />
        <span>{t.navLanguage}</span>
        <span className="text-[10px] opacity-70">▾</span>
      </button>
      {langOpen && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-2 min-w-[10.5rem] overflow-hidden rounded-sm border border-line bg-[#FAF9F6] py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={isAuto}
              className={`flex w-full px-3 py-2 text-left text-sm ${
                isAuto ? 'bg-ink text-[#FAF9F6]' : 'text-ink hover:bg-[#efece4]'
              }`}
              onClick={() => {
                setLang('auto')
                setLangOpen(false)
                setOpen(false)
              }}
            >
              {t.langAuto}
            </button>
          </li>
          {LANGS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={!isAuto && lang === item.id}
                className={`flex w-full px-3 py-2 text-left text-sm ${
                  !isAuto && lang === item.id
                    ? 'bg-ink text-[#FAF9F6]'
                    : 'text-ink hover:bg-[#efece4]'
                }`}
                onClick={() => {
                  setLang(item.id)
                  setLangOpen(false)
                  setOpen(false)
                }}
              >
                {item.native}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-[#FAF9F6]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/icon.jpg?v=4"
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-cover object-center ring-1 ring-black/5"
          />
          <span className="truncate font-display text-lg font-semibold tracking-tight text-ink">
            {t.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {pageLinks}
          {!open && langMenu}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={t.navOpen}
        >
          <HamburgerIcon open={open} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 md:hidden">
          {pageLinks}
          {langMenu}
        </div>
      )}
    </header>
  )
}
