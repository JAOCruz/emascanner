import { useState } from 'react'
import App from './App'
import MultiTimeframeDashboard from './MultiTimeFrameDashboard'

function AppWrapper() {
  const [viewMode, setViewMode] = useState('standard') // 'standard' or 'multi'

  if (viewMode === 'multi') {
    return <MultiTimeframeDashboard onBackClick={() => setViewMode('standard')} />
  }

  return <App onMultiViewClick={() => setViewMode('multi')} />
}

export default AppWrapper