import { useState } from 'react'
import { Layout } from './Layout'
import { useAuthStore } from '../../stores/authStore'
import { Onboarding } from '../Onboarding'
import { PresetActivation } from '../PresetActivation'

export const ProtectedLayout = () => {
  const { user, isAdmin } = useAuthStore()
  const [showTutorial, setShowTutorial] = useState(false)
  const [showPresetActivation, setShowPresetActivation] = useState(false)

  if (!user || isAdmin) {
    return <Layout onShowTutorial={() => setShowTutorial(true)} onShowPreset={() => setShowPresetActivation(true)} />
  }

  return (
    <>
      <Layout onShowTutorial={() => setShowTutorial(true)} onShowPreset={() => setShowPresetActivation(true)} />
      {showTutorial && <Onboarding onClose={() => setShowTutorial(false)} />}
      <PresetActivation
        isOpen={showPresetActivation}
        onClose={() => setShowPresetActivation(false)}
      />
    </>
  )
}
