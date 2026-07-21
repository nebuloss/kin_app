import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PlayersPage from './pages/PlayersPage'
import GamePage from './pages/GamePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/players" replace />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/players" replace />} />
      </Route>
    </Routes>
  )
}
