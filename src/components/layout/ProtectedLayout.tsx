import { useState } from 'react'
import { Layout } from './Layout'
import { useAuthStore } from '../../stores/authStore'
import { Onboarding } from '../Onboarding'

export const ProtectedLayout = () => {
  const { user, isAdmin } = useAuthStore()
  const [showTutorial, setShowTutorial] = useState(false)

  if (!user || isAdmin) {
    return <Layout onShowTutorial={() => setShowTutorial(true)} />
  }

  return (
    <>
      <Layout onShowTutorial={() => setShowTutorial(true)} />
      {showTutorial && <Onboarding onClose={() => setShowTutorial(false)} />}
    </>
  )
}
