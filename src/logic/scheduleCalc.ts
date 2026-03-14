import { addDays, format, parseISO } from 'date-fns';
import type { TaskTemplate, ProjectTask, ProjectTaskView, Phase, CustomProjectTask } from '../types';
import { TASK_TEMPLATES, PHASE_ORDER } from '../data/taskTemplates';
import { isAutoDelayed } from './taskUtils';

// ============================================================
// オフセット計算
// ============================================================
type TaskOffsets = { offsetStart: number; offsetEnd: number };

function buildOffsetMap(templates: TaskTemplate[]): Map<number, TaskOffsets> {
  const offsets = new Map<number, TaskOffsets>();
  const taskMap = new Map(templates.map((t) => [t.id, t]));

  function calc(id: number): TaskOffsets {
    if (offsets.has(id)) return offsets.get(id)!;
    const task = taskMap.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    let offsetStart = 0;
    if (task.predecessorTaskId !== null) {
      offsetStart = calc(task.predecessorTaskId).offsetEnd;
    }
    const result: TaskOffsets = { offsetStart, offsetEnd: offsetStart + task.days };
    offsets.set(id, result);
    return result;
  }

  for (const t of templates) calc(t.id);
  return offsets;
}

const OFFSET_MAP = buildOffsetMap(TASK_TEMPLATES);
const GOAL_TASK = TASK_TEMPLATES.find((t) => t.phase === 'GOAL')!;
export const TOTAL_LEAD_TIME_DAYS = OFFSET_MAP.get(GOAL_TASK.id)!.offsetEnd - 1;

/** 発売日 → 企画開始日 */
export function calcPlanningStartDate(launchDateStr: string): Date {
  return addDays(parseISO(launchDateStr), -TOTAL_LEAD_TIME_DAYS);
}

// フェーズ順序マップ（ソート用）
const PHASE_ORDER_MAP = new Map(PHASE_ORDER.map((p, i) => [p, i]));

/**
 * ProjectTask + TaskTemplate を結合し、計算済み日程 + isDelayed 付きのビューモデルを返す。
 * カスタムタスクと非表示タスクも処理する。
 */
export function buildProjectTaskViews(
  projectTasks: ProjectTask[],
  launchDateStr: string,
  hiddenTaskIds: number[] = [],
  customTasks: CustomProjectTask[] = []
): ProjectTaskView[] {
  const planningStart = calcPlanningStartDate(launchDateStr);
  const taskStatusMap = new Map(projectTasks.map((t) => [t.templateId, t]));

  // ── テンプレートタスクビュー（hiddenTaskIds を除外）──────
  const templateViews: ProjectTaskView[] = TASK_TEMPLATES
    .filter((template) => !hiddenTaskIds.includes(template.id))
    .map((template) => {
      const offsets = OFFSET_MAP.get(template.id)!;
      const startDate = addDays(planningStart, offsets.offsetStart);
      const endDate   = addDays(planningStart, offsets.offsetEnd - 1);

      const projectTask = taskStatusMap.get(template.id) ?? {
        templateId: template.id,
        status: 'not_started' as const,
        progressRate: 0,
      };

      return {
        ...template,
        ...projectTask,
        name:       projectTask.nameOverride ?? template.name,
        department: projectTask.departmentOverride ?? template.department,
        startDate,
        endDate,
        isDelayed: isAutoDelayed(endDate, projectTask.status),
        isCustom: false,
      };
    });

  // ── カスタムタスクビュー ────────────────────────────────
  const customViews: ProjectTaskView[] = customTasks.map((ct) => {
    const startDate = parseISO(ct.plannedStartDate);
    const endDate   = parseISO(ct.plannedEndDate);
    return {
      // TaskTemplate互換フィールド
      id:                ct.id,
      phase:             ct.phase,
      name:              ct.name,
      department:        ct.departmentOverride ?? ct.department,
      predecessorTaskId: null,
      standardDuration:  `${ct.days}日`,
      days:              ct.days,
      notes:             ct.notes,
      isMilestone:       ct.isMilestone,
      // ProjectTask互換フィールド
      templateId:        ct.id,   // 自身のIDをtemplateIdとして保持（ルーティング用）
      status:            ct.status,
      progressRate:      ct.progressRate,
      memo:              ct.memo,
      actualStartDate:   ct.actualStartDate,
      actualEndDate:     ct.actualEndDate,
      departmentOverride: ct.departmentOverride,
      assignee:          ct.assignee,
      nameOverride:      undefined,
      // 計算済みフィールド
      startDate,
      endDate,
      isDelayed: isAutoDelayed(endDate, ct.status),
      isCustom: true,
    };
  });

  // ── フェーズ順 → 開始日順でソート ────────────────────────
  const all = [...templateViews, ...customViews];
  all.sort((a, b) => {
    const phaseA = PHASE_ORDER_MAP.get(a.phase) ?? 99;
    const phaseB = PHASE_ORDER_MAP.get(b.phase) ?? 99;
    if (phaseA !== phaseB) return phaseA - phaseB;
    // 同フェーズ内: カスタムは開始日でソート、テンプレートは元の順序を保持
    if (a.isCustom !== b.isCustom) return a.isCustom ? 1 : -1;
    return a.startDate.getTime() - b.startDate.getTime();
  });

  return all;
}

/** フェーズ別進捗（完了タスク数ベース） */
export function calcPhaseProgress(views: ProjectTaskView[]): { phase: Phase; total: number; completed: number; progressRate: number }[] {
  const phaseMap = new Map<Phase, { total: number; completed: number }>();
  for (const v of views) {
    if (v.phase === 'GOAL') continue;
    const cur = phaseMap.get(v.phase) ?? { total: 0, completed: 0 };
    cur.total += 1;
    if (v.status === 'completed') cur.completed += 1;
    phaseMap.set(v.phase, cur);
  }
  return PHASE_ORDER.filter((p) => p !== 'GOAL').map((phase) => {
    const data = phaseMap.get(phase as Phase) ?? { total: 0, completed: 0 };
    return {
      phase: phase as Phase,
      total: data.total,
      completed: data.completed,
      progressRate: data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100),
    };
  });
}

/** 全体進捗（完了タスク数ベース） */
export function calcOverallProgress(views: ProjectTaskView[]): number {
  const targets = views.filter((v) => v.phase !== 'GOAL');
  if (targets.length === 0) return 0;
  const completed = targets.filter((v) => v.status === 'completed').length;
  return Math.round((completed / targets.length) * 100);
}

/** 日付を日本語フォーマットで表示 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy/MM/dd');
}
