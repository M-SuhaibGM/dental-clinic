import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import Appointments from './pages/Appointments';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Layout route: every page renders inside the shared shell (sidebar + <Outlet />). */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="doctors/:id" element={<DoctorDetail />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
