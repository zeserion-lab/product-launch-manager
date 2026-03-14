import { NavLink, Outlet } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';

export function Layout() {
  const { projects } = useProjectStore();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>新商品<br />進捗管理</h1>
          <p>Product Launch Manager</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">メニュー</div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">📊</span>
            ダッシュボード
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">📋</span>
            案件一覧
            {projects.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#334155',
                  color: '#94A3B8',
                  borderRadius: 8,
                  padding: '1px 7px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {projects.length}
              </span>
            )}
          </NavLink>
        </nav>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #1E293B',
            fontSize: 10,
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          <div>Product Launch Manager</div>
          <div>MVP v2.0</div>
        </div>
      </aside>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
