import { useEffect, useState } from 'react'
import HowToModal from '../components/HowToModal'
import VoronoiPhotoArt from '../VoronoiPhotoArt'

const SEEN_KEY = 'voronoi-howto-seen'

export default function Home() {
  const [showHowTo, setShowHowTo] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) {
      setShowHowTo(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setShowHowTo(false)
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl items-start px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
      <VoronoiPhotoArt />
      <HowToModal open={showHowTo} onClose={dismiss} />
    </div>
  )
}
