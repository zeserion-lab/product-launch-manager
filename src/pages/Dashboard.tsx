import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useProjectStore } from '../store/useProjectStore';
import { ProgressBar } from '../components/ProgressBar';
import { PhaseBadge } from '../components/PhaseBadge';
import { StatusBadge } from '../components/StatusBadge';
import { buildProjectTaskViews, formatDate } from '../logic/scheduleCalc';
import {
  calcWeightedProgress,
  countDelayedTasks,
  getAttentionTasks,
  daysUntilLaunch,
} from '../logic/taskUtils';
import type { AttentionTask } from '../types';

export function Dashboard() {
  const { projects } = useProjectStore();
  const navigate = useNavigate();

  const data = useMemo(() => {
    const rows = projects.map((p) => {
      const views = buildProjectTaskViews(p.tasks, p.launchDate, p.hiddenTaskIds, p.customTasks);
      const progress = calcWeightedProgress(views);
      const delayedCount = countDelayedTasks(views);
      const remaining = daysUntilLaunch(parseISO(p.launchDate));
      return { project: p, views, progress, delayedCount, remaining };
    });

    const totalProjects = rows.length;
    const activeProjects = rows.filter((r) => r.progress > 0 && r.progress < 100).length;
    const nearLaunch = rows.filter((r) => r.remaining >= 0 && r.remaining <= 90).length;
    const hasDelayed = rows.filter((r) => r.delayedCount > 0).length;
    const completedProjects = rows.filter((r) => r.progress >= 100).length;

    const attentionTasks: AttentionTask[] = rows.flatMap(({ project, views }) =>
      getAttentionTasks(views, project.id, project.name, 21)
    ).sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).slice(0, 10);

    return {
      rows,
      metrics: { totalProjects, activeProjects, nearLaunch, hasDelayed, completedProjects },
      attentionTasks,
    };
  }, [projects]);

  const { rows, metrics, attentionTasks } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>ダッシュボード</h2>
          <div className="breadcrumb">{format(new Date(), 'yyyy年MM月dd日')} 現在</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects/new')}>
            ＋ 新規案件登録
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── サマリーカード ─────────────────────────── */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="label">総案件数</div>
            <div className="value">{metrics.totalProjects}</div>
            <div className="sub">件</div>
          </div>
          <div className="summary-card">
            <div className="label">進行中</div>
            <div className="value" style={{ color: 'var(--color-primary)' }}>
              {metrics.activeProjects}
            </div>
            <div className="sub">件</div>
          </div>
          <div className="summary-card">
            <div className="label">発売間近（90日以内）</div>
            <div className="value" style={{ color: '#c05621' }}>{metrics.nearLaunch}</div>
            <div className="sub">件</div>
          </div>
          <div className="summary-card" style={metrics.hasDelayed > 0 ? { borderColor: '#feb2b2' } : {}}>
            <div className="label">遅延あり</div>
            <div
              className="value"
              style={{ color: metrics.hasDelayed > 0 ? '#c53030' : '#a0aec0' }}
            >
              {metrics.hasDelayed}
            </div>
            <div className="sub">件</div>
          </div>
          <div className="summary-card">
            <div className="label">完了</div>
            <div className="value" style={{ color: '#276749' }}>{metrics.completedProjects}</div>
            <div className="sub">件</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          {/* ── 案件一覧（概要） ──────────────────── */}
          <div className="card">
            <div className="card-header">
              <h3>案件一覧（進捗概要）</h3>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>
                すべて見る →
              </button>
            </div>
            <div className="table-wrapper">
              {rows.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📭</div>
                  <p>案件がありません</p>
                  <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                    最初の案件を登録する
                  </button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>案件名</th>
                      <th>発売日</th>
                      <th>残日数</th>
                      <th>遅延</th>
                      <th style={{ minWidth: 140 }}>進捗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ project, progress, delayedCount, remaining }) => (
                      <tr
                        key={project.id}
                        className="project-row"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{project.name}</div>
                          {project.productCode && (
                            <div className="text-xs text-muted">{project.productCode}</div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#c05621', fontWeight: 600 }}>
                          {formatDate(parseISO(project.launchDate))}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {remaining < 0 ? (
                            <span className="status-badge completed" style={{ fontSize: 11 }}>発売済</span>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: 13, color: remaining <= 30 ? '#c05621' : remaining <= 90 ? '#744210' : '#1a202c' }}>
                              {remaining}日
                            </span>
                          )}
                        </td>
                        <td>
                          {delayedCount > 0 ? (
                            <span className="delay-count-badge">{delayedCount}</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <ProgressBar value={progress} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── 要注意タスク ───────────────────────── */}
          <div className="card">
            <div className="card-header">
              <h3>要注意タスク</h3>
              <span className="text-xs text-muted">期限切れ・21日以内に期限</span>
            </div>
            <div className="table-wrapper">
              {attentionTasks.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 16px' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    現在、要注意タスクはありません
                  </p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>タスク</th>
                      <th>案件</th>
                      <th>期限</th>
                      <th>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionTasks.map((task) => (
                      <tr
                        key={`${task.projectId}-${task.id}`}
                        className={`project-row${task.isDelayed ? ' task-row-delayed' : ''}`}
                        onClick={() => navigate(`/projects/${task.projectId}`)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {task.isMilestone && <span className="milestone-star">★</span>}
                            <span style={{ fontSize: 13 }}>{task.name}</span>
                          </div>
                          <PhaseBadge phase={task.phase} />
                        </td>
                        <td className="text-xs text-muted">{task.projectName}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: task.isDelayed ? '#c53030' : '#744210' }}>
                            {formatDate(task.endDate)}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={task.status} isAutoDelayed={task.isDelayed} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
