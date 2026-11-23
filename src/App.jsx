import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { EditorSessionProvider } from './editorSession'
import { LanguageProvider } from './i18n'
import Album from './pages/Album'
import Guide from './pages/Guide'
import Home from './pages/Home'

export default function App() {
  return (
    <LanguageProvider>
      <EditorSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="guide" element={<Guide />} />
              <Route path="album" element={<Album />} />
              <Route path="menu" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </EditorSessionProvider>
    </LanguageProvider>
  )
}
