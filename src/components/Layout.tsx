import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';

export function Layout() {
  const { projects } = useProjectStore();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      {/* ── デスクトップ用サイドバー ── */}
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

      {/* ── コンテンツ ── */}
      <div className="main-content">
        <Outlet />
      </div>

      {/* ── スマホ用ボトムナビ ── */}
      <nav className="mobile-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">📊</span>
          <span>ダッシュボード</span>
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
        >
          <span className="mobile-nav-icon">📋</span>
          <span>案件一覧</span>
        </NavLink>

        <button
          className="mobile-nav-link"
          onClick={() => navigate('/projects/new')}
        >
          <span className="mobile-nav-icon">＋</span>
          <span>新規登録</span>
        </button>
      </nav>
    </div>
  );
}
