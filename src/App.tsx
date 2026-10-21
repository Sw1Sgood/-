import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlanPage } from './pages/PlanPage'
import { ProjectPage } from './pages/ProjectPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { ReviewPage } from './pages/ReviewPage'
import { SessionsPage } from './pages/SessionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SkillsPage } from './pages/SkillsPage'
import { TaskPage } from './pages/TaskPage'
import { WeekPage } from './pages/WeekPage'
import { StoreProvider } from './store/StoreContext'

// HashRouter: приложение работает из любой папки и с любого статического хостинга
// без настройки сервера (адреса вида index.html#/plan).
export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="week/:number" element={<WeekPage />} />
            <Route path="lesson/:id" element={<LessonPage />} />
            <Route path="task/:id" element={<TaskPage />} />
            <Route path="review/:kind/:id" element={<ReviewPage />} />
            <Route path="project" element={<ProjectPage />} />
            <Route path="project/:section" element={<ProjectPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
