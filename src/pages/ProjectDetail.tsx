import { useMemo, useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseISO, addDays } from 'date-fns';
import { useProjectStore } from '../store/useProjectStore';
import { ProgressBar } from '../components/ProgressBar';
import { PhaseBadge } from '../components/PhaseBadge';
import { StatusBadge } from '../components/StatusBadge';
import { FilterBar } from '../components/FilterBar';
import { TaskEditPanel } from '../components/TaskEditPanel';
import type { TaskEditUpdates } from '../components/TaskEditPanel';
import { AddTaskForm } from '../components/AddTaskForm';
import { GanttChart } from '../components/GanttChart';
import {
  buildProjectTaskViews,
  calcPlanningStartDate,
  formatDate,
  TOTAL_LEAD_TIME_DAYS,
} from '../logic/scheduleCalc';
import {
  calcWeightedProgress,
  calcPhaseProgressWeighted,
  countDelayedTasks,
  applyFilters,
  daysUntilLaunch,
  isEffectivelyDelayed,
} from '../logic/taskUtils';
import type { FilterState, ProjectTask, TaskStatus, CustomProjectTask } from '../types';
import { DEFAULT_FILTERS } from '../types';
import { TASK_TEMPLATES } from '../data/taskTemplates';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed',   label: '完了' },
  { value: 'on_hold',     label: '保留' },
  { value: 'delayed',     label: '遅延' },
];

type ActiveTab = 'tasks' | 'gantt';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects,
    updateTask, updateTaskStatus, updateLaunchDate,
    hideTask, restoreTask,
    addCustomTask, updateCustomTask, deleteCustomTask,
  } = useProjectStore();

  const [activeTab, setActiveTab]         = useState<ActiveTab>('tasks');
  const [filters, setFilters]             = useState<FilterState>(DEFAULT_FILTERS);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [showHidden, setShowHidden]       = useState(false);
  const [editingLaunchDate, setEditingLaunchDate] = useState(false);
  const [launchDateInput, setLaunchDateInput]     = useState('');

  const project = projects.find((p) => p.id === id);

  const hiddenTaskIds = project?.hiddenTaskIds ?? [];
  const customTasks   = project?.customTasks   ?? [];

  // 表示用ビュー（showHidden なら非表示タスクも含む）
  const allViews = useMemo(
    () => project
      ? buildProjectTaskViews(
          project.tasks,
          project.launchDate,
          showHidden ? [] : hiddenTaskIds,   // 非表示表示時は全件
          customTasks
        )
      : [],
    [project, showHidden, hiddenTaskIds, customTasks]
  );

  const filteredViews = useMemo(() => applyFilters(allViews, filters), [allViews, filters]);

  const overallProgress = useMemo(() => calcWeightedProgress(allViews), [allViews]);
  const phaseProgress   = useMemo(() => calcPhaseProgressWeighted(allViews), [allViews]);
  const delayedCount    = useMemo(() => countDelayedTasks(allViews), [allViews]);
  const planningStart   = useMemo(
    () => project ? calcPlanningStartDate(project.launchDate) : null,
    [project]
  );

  // 発売日変更プレビュー
  const previewPlanningStart = useMemo(
    () => launchDateInput ? addDays(parseISO(launchDateInput), -TOTAL_LEAD_TIME_DAYS) : null,
    [launchDateInput]
  );

  const departments = useMemo(
    () => Array.from(new Set(TASK_TEMPLATES.map((t) => t.department))).sort(),
    []
  );
  const phases = useMemo(
    () => Array.from(new Set(TASK_TEMPLATES.map((t) => t.phase))),
    []
  );

  // フェーズ区切り位置（フェーズ絞込・キーワードなし時のみ）
  const phaseHeaders = useMemo(() => {
    const seen = new Set<string>();
    const result = new Map<number, boolean>();
    for (const v of filteredViews) {
      result.set(v.id, !seen.has(v.phase));
      seen.add(v.phase);
    }
    return result;
  }, [filteredViews]);

  if (!project) {
    return (
      <>
        <div className="page-header"><h2>案件詳細</h2></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="icon">🔍</div>
            <p>案件が見つかりません</p>
            <button className="btn btn-outline" onClick={() => navigate('/projects')}>
              案件一覧へ戻る
            </button>
          </div>
        </div>
      </>
    );
  }

  const remaining = daysUntilLaunch(parseISO(project.launchDate));

  // ── イベントハンドラ ────────────────────────────────────

  const handleLaunchDateSave = () => {
    if (launchDateInput) updateLaunchDate(project.id, launchDateInput);
    setEditingLaunchDate(false);
    setLaunchDateInput('');
  };

  /** テンプレート / カスタムタスクを判別して正しい更新アクションへルーティング */
  const handleTaskUpdate = (taskId: number, isCustom: boolean, updates: TaskEditUpdates) => {
    const { name, plannedStartDate, plannedEndDate, ...rest } = updates;

    if (isCustom) {
      const customUpdates: Partial<Omit<CustomProjectTask, 'id'>> = { ...rest };
      if (name !== undefined) customUpdates.name = name || undefined;
      if (plannedStartDate)   customUpdates.plannedStartDate = plannedStartDate;
      if (plannedEndDate)     customUpdates.plannedEndDate   = plannedEndDate;
      updateCustomTask(project.id, taskId, customUpdates);
    } else {
      const taskUpdates: Partial<Omit<ProjectTask, 'templateId'>> = { ...rest };
      if (name !== undefined) taskUpdates.nameOverride = name || undefined;
      updateTask(project.id, taskId, taskUpdates);
    }
  };

  const handleDelete = (taskId: number, isCustom: boolean) => {
    if (isCustom) {
      deleteCustomTask(project.id, taskId);
    } else {
      hideTask(project.id, taskId);
    }
    setExpandedTaskId(null);
  };

  const handleAddTask = (task: Omit<CustomProjectTask, 'id'>) => {
    addCustomTask(project.id, task);
    setShowAddForm(false);
  };

  const toggleExpand = (taskId: number) =>
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));

  // ── レンダリング ────────────────────────────────────────

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>{project.name}</h2>
          <div className="breadcrumb">
            <span
              style={{ cursor: 'pointer', color: 'var(--primary)' }}
              onClick={() => navigate('/projects')}
            >
              案件一覧
            </span>
            {' ＞ '}{project.name}
          </div>
        </div>
        <div className="page-actions">
          {delayedCount > 0 && (
            <span className="delay-count-badge" style={{ padding: '4px 10px', fontSize: 12 }}>
              ⚠ 遅延 {delayedCount}件
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>
            ← 一覧
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── 案件概要 ──────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="info-row mb-16">
              <div className="info-item">
                <span className="info-label">発売目標日</span>
                {editingLaunchDate ? (
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="date" className="form-control" style={{ width: 160 }}
                        value={launchDateInput}
                        onChange={(e) => setLaunchDateInput(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleLaunchDateSave}>保存</button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { setEditingLaunchDate(false); setLaunchDateInput(''); }}
                      >
                        キャンセル
                      </button>
                    </div>
                    {previewPlanningStart && (
                      <div className="launch-date-preview">
                        <span>📅 変更後の企画開始日:</span>
                        <strong>{formatDate(previewPlanningStart)}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          （全{TOTAL_LEAD_TIME_DAYS}日間・全タスク日程が自動再計算されます）
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="info-value accent">{formatDate(parseISO(project.launchDate))}</span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setLaunchDateInput(project.launchDate); setEditingLaunchDate(true); }}
                    >
                      変更
                    </button>
                  </div>
                )}
              </div>

              <div className="info-item">
                <span className="info-label">企画開始日</span>
                <span className="info-value" style={{ fontSize: 16 }}>
                  {planningStart ? formatDate(planningStart) : '—'}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">発売まで</span>
                <span
                  className="info-value"
                  style={{
                    color: remaining < 0 ? 'var(--green)' : remaining <= 30 ? 'var(--orange)' : remaining <= 90 ? 'var(--yellow)' : 'var(--text)',
                    fontSize: 20,
                  }}
                >
                  {remaining < 0 ? '発売済' : `${remaining}日`}
                </span>
              </div>

              {delayedCount > 0 && (
                <div className="info-item">
                  <span className="info-label">遅延タスク</span>
                  <span className="info-value" style={{ color: 'var(--red)' }}>{delayedCount}件</span>
                </div>
              )}

              {project.productCode && (
                <div className="info-item">
                  <span className="info-label">商品コード</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-2)' }}>
                    {project.productCode}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>全体進捗</span>
                <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                  {overallProgress}%
                </span>
              </div>
              <ProgressBar value={overallProgress} size="lg" showLabel={false} />
            </div>

            {project.description && (
              <p className="mt-12 text-sm text-muted">{project.description}</p>
            )}
          </div>
        </div>

        {/* ── フェーズ別進捗 ──────────────────────────── */}
        <div className="card mb-16">
          <div className="card-header"><h3>フェーズ別進捗</h3></div>
          <div className="card-body">
            <div className="phase-progress-grid">
              {phaseProgress.map((pp) => (
                <div key={pp.phase} className="phase-progress-item">
                  <div className="phase-progress-header">
                    <PhaseBadge phase={pp.phase} />
                    <span className="phase-progress-count">{pp.completed}/{pp.total}</span>
                  </div>
                  <ProgressBar value={pp.progressRate} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── タスク一覧 / ガント ─────────────────────── */}
        <div className="card">
          {/* タブ */}
          <div className="tab-nav">
            <button
              className={`tab-btn${activeTab === 'tasks' ? ' active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              📋 タスク一覧
            </button>
            <button
              className={`tab-btn${activeTab === 'gantt' ? ' active' : ''}`}
              onClick={() => setActiveTab('gantt')}
            >
              📅 ガントチャート
            </button>
          </div>

          {/* ── タスク一覧タブ ─────────────────────── */}
          {activeTab === 'tasks' && (
            <>
              {/* フィルターバー */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <FilterBar
                  filters={filters}
                  departments={departments}
                  phases={phases}
                  filteredCount={filteredViews.length}
                  totalCount={allViews.length}
                  onChange={setFilters}
                />
              </div>

              {/* 操作バー */}
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
                  ★ 重要工程　⚠ 遅延　▼ 行クリックで詳細編集
                </span>

                {/* 非表示タスクの表示切替 */}
                {hiddenTaskIds.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                    />
                    非表示タスクを表示（{hiddenTaskIds.length}件）
                  </label>
                )}

                {/* タスク追加ボタン */}
                <button
                  className="btn btn-sm"
                  style={{ background: '#7C3AED', color: '#fff', borderColor: '#6D28D9' }}
                  onClick={() => { setShowAddForm((v) => !v); setExpandedTaskId(null); }}
                >
                  ＋ タスク追加
                </button>
              </div>

              {/* テーブル */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th style={{ width: 72 }}>フェーズ</th>
                      <th>タスク名称</th>
                      <th style={{ width: 120 }}>担当部署 / 担当者</th>
                      <th style={{ width: 88 }}>予定開始</th>
                      <th style={{ width: 88 }}>予定完了</th>
                      <th style={{ width: 80 }}>進捗率</th>
                      <th style={{ width: 105 }}>ステータス</th>
                      <th style={{ width: 44 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* タスク追加フォーム（テーブル先頭に表示） */}
                    {showAddForm && (
                      <AddTaskForm
                        onAdd={handleAddTask}
                        onCancel={() => setShowAddForm(false)}
                      />
                    )}

                    {filteredViews.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                          条件に一致するタスクがありません
                        </td>
                      </tr>
                    ) : (
                      filteredViews.map((task) => {
                        const isExpanded = expandedTaskId === task.id;
                        const delayed    = isEffectivelyDelayed(task.endDate, task.status);
                        const showSep    = phaseHeaders.get(task.id) && !filters.keyword && !filters.phase;
                        const barRate    = task.status === 'completed' ? 100 : task.progressRate;
                        // 非表示タスクは薄く表示
                        const isHidden   = !task.isCustom && hiddenTaskIds.includes(task.id);

                        return (
                          <Fragment key={task.id}>
                            {/* フェーズ区切り */}
                            {showSep && (
                              <tr className="phase-separator">
                                <td colSpan={9}><PhaseBadge phase={task.phase} /></td>
                              </tr>
                            )}

                            {/* タスク行 */}
                            <tr
                              className={[
                                'task-row',
                                delayed         ? 'task-row-delayed' : '',
                                task.isMilestone? 'task-row-milestone' : '',
                                task.phase === 'GOAL' ? 'task-row-goal' : '',
                                isExpanded      ? 'task-row-expanded' : '',
                              ].filter(Boolean).join(' ')}
                              style={{ opacity: isHidden ? 0.45 : 1 }}
                              onClick={() => toggleExpand(task.id)}
                            >
                              <td className="col-no">
                                <span
                                  className="task-no"
                                  style={task.isCustom ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#DDD6FE' } : {}}
                                >
                                  {task.isCustom ? 'C' : task.id}
                                </span>
                              </td>
                              <td>
                                {(filters.phase || filters.keyword) && (
                                  <PhaseBadge phase={task.phase} />
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {task.isMilestone && <span className="milestone-star" title="重要工程">★</span>}
                                  {delayed && task.phase !== 'GOAL' && <span className="delay-icon" title="遅延">⚠</span>}
                                  {task.isCustom && (
                                    <span
                                      title="カスタムタスク"
                                      style={{ fontSize: 10, color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}
                                    >
                                      追加
                                    </span>
                                  )}
                                  {isHidden && (
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>（非表示）</span>
                                  )}
                                  <span style={{ fontWeight: (task.phase === 'GOAL' || task.isMilestone) ? 700 : 400 }}>
                                    {task.nameOverride ?? task.name}
                                    {task.nameOverride && !task.isCustom && (
                                      <span style={{ fontSize: 10, color: 'var(--primary)', marginLeft: 4 }}>✎</span>
                                    )}
                                  </span>
                                </div>
                                {task.memo && (
                                  <div className="text-xs mt-2" style={{ color: '#2563EB' }}>
                                    💬 {task.memo}
                                  </div>
                                )}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <div className="text-sm" style={{ color: task.departmentOverride ? 'var(--primary)' : 'var(--text-muted)' }}>
                                  {task.department}
                                  {task.departmentOverride && (
                                    <span style={{ marginLeft: 3, fontSize: 10, color: 'var(--primary)' }}>✎</span>
                                  )}
                                </div>
                                {task.assignee && (
                                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                                    👤 {task.assignee}
                                  </div>
                                )}
                              </td>
                              <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-2)' }}>
                                {formatDate(task.startDate)}
                              </td>
                              <td style={{
                                whiteSpace: 'nowrap', fontSize: 12,
                                fontWeight: delayed ? 700 : 400,
                                color: delayed ? 'var(--red)' : 'var(--text-2)',
                              }}>
                                {formatDate(task.endDate)}
                              </td>
                              <td>
                                {task.phase !== 'GOAL' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', minWidth: 36 }}>
                                      <div style={{
                                        height: '100%', width: `${barRate}%`,
                                        background: task.status === 'completed' ? '#22C55E' : 'var(--primary)',
                                        borderRadius: 3,
                                      }} />
                                    </div>
                                    <span className="text-xs text-muted" style={{ minWidth: 26, textAlign: 'right' }}>
                                      {barRate}%
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {task.phase !== 'GOAL' ? (
                                  <select
                                    className={`status-select status-select-${task.status}${delayed && task.status !== 'delayed' ? ' status-select-auto-delayed' : ''}`}
                                    value={task.status}
                                    onChange={(e) => {
                                      if (task.isCustom) {
                                        updateCustomTask(project.id, task.id, { status: e.target.value as TaskStatus });
                                      } else {
                                        updateTaskStatus(project.id, task.templateId, e.target.value as TaskStatus);
                                      }
                                    }}
                                  >
                                    {STATUS_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <StatusBadge status={task.status} />
                                )}
                              </td>
                              <td>
                                {/* 非表示タスクの復元ボタン */}
                                {isHidden ? (
                                  <button
                                    className="btn btn-sm btn-outline"
                                    style={{ fontSize: 10, padding: '2px 6px' }}
                                    onClick={(e) => { e.stopPropagation(); restoreTask(project.id, task.id); }}
                                    title="タスクを再表示"
                                  >
                                    ↩
                                  </button>
                                ) : (
                                  <button
                                    className={`btn btn-sm btn-outline edit-toggle-btn${isExpanded ? ' active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                                    title="詳細編集"
                                  >
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* 編集パネル */}
                            {isExpanded && !isHidden && (
                              <TaskEditPanel
                                task={task}
                                onSave={(updates) => handleTaskUpdate(task.id, task.isCustom, updates)}
                                onDelete={() => handleDelete(task.id, task.isCustom)}
                                onClose={() => setExpandedTaskId(null)}
                              />
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ガントタブ ──────────────────────────── */}
          {activeTab === 'gantt' && planningStart && (
            <GanttChart
              views={allViews}
              planningStartDate={planningStart}
              launchDate={parseISO(project.launchDate)}
            />
          )}
        </div>
      </div>
    </>
  );
}
