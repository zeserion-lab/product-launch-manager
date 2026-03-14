import type { TaskStatus } from '../types';

type Props = { status: TaskStatus; isAutoDelayed?: boolean };

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  on_hold: '保留',
  delayed: '遅延',
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  not_started: '○',
  in_progress: '◐',
  completed: '✓',
  on_hold: '⏸',
  delayed: '⚠',
};

export function StatusBadge({ status, isAutoDelayed = false }: Props) {
  const effectiveStatus: TaskStatus =
    isAutoDelayed && status !== 'completed' && status !== 'on_hold' ? 'delayed' : status;

  return (
    <span className={`status-badge ${effectiveStatus}`}>
      <span>{STATUS_ICONS[effectiveStatus]}</span>
      {STATUS_LABELS[effectiveStatus]}
    </span>
  );
}
