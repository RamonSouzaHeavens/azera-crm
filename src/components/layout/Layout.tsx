import { Outlet, useOutletContext } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

type LayoutContextType = {
  onShowTutorial?: () => void
}

export const Layout = ({ onShowTutorial }: { onShowTutorial?: () => void }) => {
  return (
  <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onShowTutorial={onShowTutorial} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ onShowTutorial } satisfies LayoutContextType} />
        </main>
      </div>
    </div>
  )
}

export function useLayoutContext() {
  return useOutletContext<LayoutContextType>()
}
