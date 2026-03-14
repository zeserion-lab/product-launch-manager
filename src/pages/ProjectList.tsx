import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { useProjectStore } from '../store/useProjectStore';
import { ProgressBar } from '../components/ProgressBar';
import { buildProjectTaskViews, calcPlanningStartDate, formatDate } from '../logic/scheduleCalc';
import { calcWeightedProgress, countDelayedTasks, daysUntilLaunch } from '../logic/taskUtils';

export function ProjectList() {
  const { projects, deleteProject } = useProjectStore();
  const navigate = useNavigate();

  const handleDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (window.confirm(`「${projectName}」を削除しますか？\nタスクのデータも含めてすべて削除されます。この操作は元に戻せません。`)) {
      deleteProject(projectId);
    }
  };

  const rows = useMemo(
    () =>
      projects.map((project) => {
        const views = buildProjectTaskViews(project.tasks, project.launchDate, project.hiddenTaskIds, project.customTasks);
        const progress = calcWeightedProgress(views);
        const delayedCount = countDelayedTasks(views);
        const planningStart = calcPlanningStartDate(project.launchDate);
        const remaining = daysUntilLaunch(parseISO(project.launchDate));
        const completedTasks = views.filter((v) => v.status === 'completed' && v.phase !== 'GOAL').length;
        const totalTasks = views.filter((v) => v.phase !== 'GOAL').length;
        return { project, progress, delayedCount, planningStart, remaining, completedTasks, totalTasks };
      }),
    [projects]
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>案件一覧</h2>
          <div className="breadcrumb">{rows.length} 件</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects/new')}>
            ＋ 新規案件登録
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="table-wrapper">
            {rows.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>案件が登録されていません</p>
                <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                  最初の案件を登録する
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>案件名</th>
                    <th>発売目標日</th>
                    <th>企画開始日</th>
                    <th>残日数</th>
                    <th>完了 / 合計</th>
                    <th>遅延タスク</th>
                    <th style={{ minWidth: 180 }}>全体進捗</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ project, progress, delayedCount, planningStart, remaining, completedTasks, totalTasks }, i) => (
                    <tr
                      key={project.id}
                      className={`project-row${delayedCount > 0 ? ' project-row-has-delay' : ''}`}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td className="col-no">{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{project.name}</div>
                        {project.productCode && (
                          <div className="text-xs text-muted">{project.productCode}</div>
                        )}
                        {project.description && (
                          <div className="text-xs text-muted truncate" style={{ maxWidth: 260 }}>
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#c05621', whiteSpace: 'nowrap' }}>
                        {formatDate(parseISO(project.launchDate))}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(planningStart)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {remaining < 0 ? (
                          <span className="status-badge completed" style={{ fontSize: 11 }}>発売済</span>
                        ) : (
                          <span style={{ fontWeight: 700, color: remaining <= 30 ? '#c05621' : remaining <= 90 ? '#744210' : '#1a202c' }}>
                            {remaining}日
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{completedTasks}</strong>
                        {' / '}{totalTasks}
                      </td>
                      <td>
                        {delayedCount > 0 ? (
                          <span className="delay-count-badge">{delayedCount} 件</span>
                        ) : (
                          <span className="text-xs" style={{ color: '#68d391' }}>なし</span>
                        )}
                      </td>
                      <td>
                        <ProgressBar value={progress} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                          >
                            詳細
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => handleDelete(e, project.id, project.name)}
                            title="案件を削除"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
