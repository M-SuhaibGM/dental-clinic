import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icons';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/doctors', label: 'Doctors', icon: 'doctor' },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' },
];

/** App shell: sidebar navigation (drawer on mobile) + routed page content via <Outlet />. */
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]); // close drawer after navigating

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>
          <Icon name="menu" />
        </button>
        <Brand />
      </header>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <nav aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={n.icon} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot">Clinic staff portal</p>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main id="main" className="main"><Outlet /></main>
    </div>
  );
}

const Brand = () => (
  <div className="brand">
    <img src="/tooth.svg" alt="" width="32" height="32" />
    <div><strong>BrightSmile</strong><span>Dental Clinic</span></div>
  </div>
);
