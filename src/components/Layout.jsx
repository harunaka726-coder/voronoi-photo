import { Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

const AD_PATHS = new Set(['/', '/guide', '/album'])

export default function Layout() {
  const { pathname } = useLocation()
  const showAd = AD_PATHS.has(pathname)
  const isHome = pathname === '/'

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <Header />
      <main
        className={`min-h-0 flex-1 ${
          isHome ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <Outlet />
      </main>
      <Footer showAd={showAd} />
    </div>
  )
}
