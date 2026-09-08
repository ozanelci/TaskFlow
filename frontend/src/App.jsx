import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import TaskRequests from './pages/TaskRequests'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import Rooms from './pages/Rooms'
import { RoomProvider } from './context/RoomContext'

function App() {
  return (
    <RoomProvider>
      <BrowserRouter>
        <Routes>

        {/* PUBLIC */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* PROTECTED */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
  path="/rooms"
  element={
    <ProtectedRoute>
      <Rooms />
    </ProtectedRoute>
  }
/>

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        <Route path="/register" element={<Register />} />

        <Route
          path="/tasks/:taskId"
          element={
            <ProtectedRoute>
              <TaskDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/task-requests"
          element={
            <ProtectedRoute>
              <TaskRequests />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
      </BrowserRouter>
    </RoomProvider>
  )
}

export default App