import { useMemo } from 'react';
import {
  differenceInDays,
  format,
  startOfMonth,
  addMonths,
  startOfDay,
} from 'date-fns';
import type { ProjectTaskView, TaskStatus } from '../types';
import { PHASE_ORDER } from '../data/taskTemplates';
import { TOTAL_LEAD_TIME_DAYS, formatDate } from '../logic/scheduleCalc';
import { STATUS_LABELS } from './StatusBadge';

type Props = {
  views: ProjectTaskView[];
  planningStartDate: Date;
  launchDate: Date;
};

// ステータス別バー色
const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: '#CBD5E1',
  in_progress: '#60A5FA',
  completed:   '#4ADE80',
  on_hold:     '#C4B5FD',
  delayed:     '#F87171',
};

export function GanttChart({ views, planningStartDate, launchDate }: Props) {
  // 全体日数（planningStart〜launchDate）
  const totalDays = TOTAL_LEAD_TIME_DAYS + 1;

  // 今日の位置 (%)
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, planningStartDate);
  const todayPct = (todayOffset / totalDays) * 100;
  const todayInRange = todayOffset >= 0 && todayOffset <= totalDays;

  // 月ラベル生成
  const months = useMemo(() => {
    const result: { label: string; leftPct: number; widthPct: number }[] = [];
    let cur = startOfMonth(planningStartDate);
    while (cur <= launchDate) {
      const next = addMonths(cur, 1);
      const mStart = cur < planningStartDate ? planningStartDate : cur;
      const mEnd   = next > launchDate       ? launchDate         : new Date(next.getTime() - 86400000);
      const s = Math.max(0, differenceInDays(mStart, planningStartDate));
      const e = Math.min(totalDays - 1, differenceInDays(mEnd, planningStartDate));
      if (e >= s) {
        result.push({
          label:    format(cur, 'yyyy/M月'),
          leftPct:  (s / totalDays) * 100,
          widthPct: ((e - s + 1) / totalDays) * 100,
        });
      }
      cur = next;
    }
    return result;
  }, [planningStartDate, launchDate, totalDays]);

  // フェーズ別グループ
  const grouped = useMemo(
    () =>
      PHASE_ORDER.map((phase) => ({
        phase,
        tasks: views.filter((v) => v.phase === phase),
      })).filter((g) => g.tasks.length > 0),
    [views]
  );

  // バーの位置・幅を計算
  const getBarStyle = (task: ProjectTaskView) => {
    const s = differenceInDays(task.startDate, planningStartDate);
    const e = differenceInDays(task.endDate,   planningStartDate);
    return {
      left:  `${(s / totalDays) * 100}%`,
      width: `${Math.max(0.4, ((e - s + 1) / totalDays) * 100)}%`,
      background: STATUS_COLORS[task.status],
    };
  };

  return (
    <div className="gantt-outer">
      <div className="gantt-inner">
        {/* 月ヘッダー */}
        <div className="gantt-row gantt-header-row">
          <div className="gantt-label-col">フェーズ / タスク</div>
          <div className="gantt-bar-col" style={{ position: 'relative' }}>
            {months.map((m, i) => (
              <div
                key={i}
                className="gantt-month"
                style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
              >
                {m.label}
              </div>
            ))}
            {todayInRange && (
              <div className="gantt-today-line" style={{ left: `${todayPct}%` }} />
            )}
          </div>
        </div>

        {/* フェーズ別タスク行 */}
        {grouped.map(({ phase, tasks }) => (
          <div key={phase}>
            {/* フェーズヘッダー */}
            <div className="gantt-row gantt-phase-row">
              <div className="gantt-label-col gantt-phase-label">{phase}</div>
              <div
                className="gantt-bar-col"
                style={{ position: 'relative', height: 26 }}
              >
                {todayInRange && (
                  <div
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${todayPct}%`, width: 1,
                      background: 'rgba(239,68,68,0.25)', zIndex: 3,
                    }}
                  />
                )}
              </div>
            </div>

            {/* タスクバー行 */}
            {tasks.map((task) => {
              const barStyle = getBarStyle(task);
              return (
                <div
                  key={task.id}
                  className={`gantt-row gantt-task-row-g${task.phase === 'GOAL' ? ' gantt-goal-row' : ''}`}
                >
                  <div className="gantt-label-col">
                    {task.isMilestone && (
                      <span className="milestone-star" style={{ fontSize: 10 }} title="重要工程">★</span>
                    )}
                    <span className="gantt-task-no">{task.id}</span>
                    <span
                      className="gantt-task-name-g"
                      title={`${task.name}  ${formatDate(task.startDate)} 〜 ${formatDate(task.endDate)}`}
                    >
                      {task.name}
                    </span>
                  </div>
                  <div
                    className="gantt-bar-col"
                    style={{ position: 'relative' }}
                  >
                    {/* 今日ライン（フェード） */}
                    {todayInRange && (
                      <div
                        style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${todayPct}%`, width: 1,
                          background: 'rgba(239,68,68,0.22)', zIndex: 3,
                        }}
                      />
                    )}
                    {/* タスクバー */}
                    <div
                      className={`gantt-bar${task.isDelayed ? ' gantt-bar-delayed' : ''}${task.isMilestone ? ' gantt-bar-milestone' : ''}`}
                      style={barStyle}
                      title={`[${task.id}] ${task.name}\n${formatDate(task.startDate)} 〜 ${formatDate(task.endDate)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 凡例 */}
        <div className="gantt-legend">
          {(Object.entries(STATUS_COLORS) as [TaskStatus, string][]).map(([s, c]) => (
            <div key={s} className="gantt-legend-item">
              <div className="gantt-legend-color" style={{ background: c }} />
              <span>{STATUS_LABELS[s]}</span>
            </div>
          ))}
          {todayInRange && (
            <div className="gantt-legend-item">
              <div style={{ width: 2, height: 12, background: 'rgba(239,68,68,0.7)' }} />
              <span>今日</span>
            </div>
          )}
          <div className="gantt-legend-item" style={{ marginLeft: 'auto', color: 'var(--text-light)' }}>
            企画開始: {formatDate(planningStartDate)} 　 発売日: {formatDate(launchDate)}
          </div>
        </div>
      </div>
    </div>
  );
}
