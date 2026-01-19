import { Outlet, useOutletContext, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

type LayoutContextType = {
  onShowTutorial?: () => void
  onShowPreset?: () => void
}

export const Layout = ({ onShowTutorial, onShowPreset }: { onShowTutorial?: () => void; onShowPreset?: () => void }) => {
  const location = useLocation()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onShowTutorial={onShowTutorial} onShowPreset={onShowPreset} />
        <main className={`flex-1 overflow-y-auto ${!location.pathname.includes('/conversations') ? 'pb-20 sm:pb-24' : ''} md:pb-0`}>
          <Outlet context={{ onShowTutorial, onShowPreset } satisfies LayoutContextType} />
        </main>
      </div>
    </div>
  )
}

export function useLayoutContext() {
  return useOutletContext<LayoutContextType>()
}

