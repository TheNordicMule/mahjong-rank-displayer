import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <nav className="navbar">
        <span className="nav-title"><span className="nav-title-accent">麻将</span>战绩</span>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/record" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Record
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            History
          </NavLink>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
