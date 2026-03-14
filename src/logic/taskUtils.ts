import { startOfDay, addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import type { TaskStatus, ProjectTaskView, PhaseProgress, AttentionTask, Phase } from '../types';
import { PHASE_ORDER } from '../data/taskTemplates';

// ============================================================
// 遅延判定ロジック
//
// 遅延 = plannedEndDate が今日より前 かつ ステータスが未完了
// 「completed」「on_hold」は遅延扱いしない
// 手動ステータス 'delayed' も遅延として扱う
// ============================================================

const NON_DELAYED_STATUSES: TaskStatus[] = ['completed', 'on_hold'];

/**
 * 自動遅延検出: 予定完了日を過ぎていて未完了なら遅延
 */
export function isAutoDelayed(endDate: Date, status: TaskStatus): boolean {
  if (NON_DELAYED_STATUSES.includes(status)) return false;
  return isBefore(endDate, startOfDay(new Date()));
}

/**
 * 実効遅延判定: 自動検出 OR 手動「遅延」ステータス
 */
export function isEffectivelyDelayed(endDate: Date, status: TaskStatus): boolean {
  return status === 'delayed' || isAutoDelayed(endDate, status);
}

// ============================================================
// 案件・タスク集計
// ============================================================

/** 遅延タスク数（GOAL除く） */
export function countDelayedTasks(views: ProjectTaskView[]): number {
  return views.filter(
    (v) => v.phase !== 'GOAL' && isEffectivelyDelayed(v.endDate, v.status)
  ).length;
}

/** 全体進捗率（progressRate加重平均、GOAL除く） */
export function calcWeightedProgress(views: ProjectTaskView[]): number {
  const targets = views.filter((v) => v.phase !== 'GOAL');
  if (targets.length === 0) return 0;
  const sum = targets.reduce((acc, v) => {
    const rate = v.status === 'completed' ? 100 : v.progressRate;
    return acc + rate;
  }, 0);
  return Math.round(sum / targets.length);
}

/** フェーズ別進捗集計（progressRate加重平均） */
export function calcPhaseProgressWeighted(views: ProjectTaskView[]): PhaseProgress[] {
  const phaseMap = new Map<Phase, { total: number; completed: number; rateSum: number }>();

  for (const v of views) {
    if (v.phase === 'GOAL') continue;
    const cur = phaseMap.get(v.phase) ?? { total: 0, completed: 0, rateSum: 0 };
    cur.total += 1;
    if (v.status === 'completed') cur.completed += 1;
    cur.rateSum += v.status === 'completed' ? 100 : v.progressRate;
    phaseMap.set(v.phase, cur);
  }

  return PHASE_ORDER.filter((p) => p !== 'GOAL').map((phase) => {
    const data = phaseMap.get(phase as Phase) ?? { total: 0, completed: 0, rateSum: 0 };
    return {
      phase: phase as Phase,
      total: data.total,
      completed: data.completed,
      progressRate: data.total === 0 ? 0 : Math.round(data.rateSum / data.total),
    };
  });
}

// ============================================================
// 注目タスク（ダッシュボード用）
//
// 「直近N日以内に期限が来る（または既に超過している）未完了タスク」
// ============================================================

/**
 * 注目タスク一覧を取得（遅延済み + N日以内に期限切れ）
 * @param views    案件ビューモデル
 * @param projectId  案件ID
 * @param projectName 案件名
 * @param daysAhead  何日先まで対象にするか（デフォルト14日）
 */
export function getAttentionTasks(
  views: ProjectTaskView[],
  projectId: string,
  projectName: string,
  daysAhead = 14
): AttentionTask[] {
  const today = startOfDay(new Date());
  const limit = addDays(today, daysAhead);

  return views
    .filter((v) => {
      if (v.phase === 'GOAL') return false;
      if (NON_DELAYED_STATUSES.includes(v.status)) return false;
      const endDay = startOfDay(v.endDate);
      return !isAfter(endDay, limit); // 今日〜+N日 or 既に過去
    })
    .map((v) => ({ ...v, projectId, projectName }));
}

/** 発売日まで残り何日か（マイナスなら発売済み） */
export function daysUntilLaunch(launchDate: Date): number {
  return differenceInDays(startOfDay(launchDate), startOfDay(new Date()));
}

/** フィルタリング適用（ProjectDetailで使用） */
export function applyFilters(
  views: ProjectTaskView[],
  filters: {
    keyword: string;
    phase: string;
    department: string;
    status: string;
    delayedOnly: boolean;
    milestoneOnly: boolean;
  }
): ProjectTaskView[] {
  return views.filter((v) => {
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      if (
        !v.name.toLowerCase().includes(kw) &&
        !v.department.toLowerCase().includes(kw) &&
        !v.notes.toLowerCase().includes(kw) &&
        !(v.memo ?? '').toLowerCase().includes(kw) &&
        !(v.assignee ?? '').toLowerCase().includes(kw)
      ) {
        return false;
      }
    }
    if (filters.phase && v.phase !== filters.phase) return false;
    if (filters.department && v.department !== filters.department) return false;
    if (filters.status && v.status !== filters.status) return false;
    if (filters.delayedOnly && !isEffectivelyDelayed(v.endDate, v.status)) return false;
    if (filters.milestoneOnly && !v.isMilestone) return false;
    return true;
  });
}

/** フィルターが1つでも有効かどうか */
export function hasActiveFilter(filters: {
  keyword: string;
  phase: string;
  department: string;
  status: string;
  delayedOnly: boolean;
  milestoneOnly: boolean;
}): boolean {
  return (
    !!filters.keyword ||
    !!filters.phase ||
    !!filters.department ||
    !!filters.status ||
    filters.delayedOnly ||
    filters.milestoneOnly
  );
}
