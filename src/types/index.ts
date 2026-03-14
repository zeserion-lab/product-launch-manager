// ============================================================
// 型定義 v2 — Project / TaskTemplate / ProjectTask の責務分離
// ============================================================

/** フェーズ */
export type Phase =
  | '1.企画'
  | '2.試作'
  | '3.仕様'
  | '4.登録'
  | '5.製造'
  | '6.準備'
  | 'GOAL';

/** タスクステータス */
export type TaskStatus =
  | 'not_started'  // 未着手
  | 'in_progress'  // 進行中
  | 'completed'    // 完了
  | 'on_hold'      // 保留
  | 'delayed';     // 遅延（手動マーク）

// ============================================================
// TaskTemplate: 全案件共通の標準工程雛形（ソースに固定）
// ============================================================
export type TaskTemplate = {
  id: number;
  phase: Phase;
  name: string;
  department: string;
  predecessorTaskId: number | null;
  standardDuration: string;
  days: number;
  notes: string;
  isMilestone: boolean;  // 重要マイルストーン工程フラグ
};

// ============================================================
// ProjectTask: 案件固有タスク実績（テンプレートタスク用）
// ============================================================
export type ProjectTask = {
  templateId: number;
  status: TaskStatus;
  progressRate: number;            // 0-100 (進捗率%)
  memo?: string;
  actualStartDate?: string;        // 実績開始日 (ISO)
  actualEndDate?: string;          // 実績完了日 (ISO)
  departmentOverride?: string;     // 担当部署（テンプレートの上書き）
  assignee?: string;               // 担当者名
  nameOverride?: string;           // タスク名の上書き
};

// ============================================================
// CustomProjectTask: ユーザーが追加したカスタムタスク
// ============================================================
export type CustomProjectTask = {
  id: number;                  // 100 以上（テンプレートIDと重複しない）
  phase: Phase;
  name: string;
  department: string;
  notes: string;
  days: number;
  isMilestone: boolean;
  status: TaskStatus;
  progressRate: number;
  memo?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  departmentOverride?: string;
  assignee?: string;
  plannedStartDate: string;    // ISO — 手動設定（逆算しない）
  plannedEndDate: string;      // ISO — 手動設定（逆算しない）
};

// ============================================================
// Project: 案件エンティティ
// ============================================================
export type Project = {
  id: string;
  name: string;
  productCode?: string;
  description?: string;
  launchDate: string;           // ISO — スケジュール逆算基準
  tasks: ProjectTask[];
  hiddenTaskIds?: number[];     // 非表示にしたテンプレートタスクID
  customTasks?: CustomProjectTask[];  // ユーザー追加タスク
  nextCustomTaskId?: number;    // 次のカスタムタスクID（デフォルト100）
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// ProjectTaskView: UI表示用結合型（計算済み）
// ============================================================
export type ProjectTaskView = ProjectTask &
  TaskTemplate & {
    startDate: Date;
    endDate: Date;
    isDelayed: boolean;  // 自動遅延検出 (plannedEnd < today && 未完了)
    isCustom: boolean;   // true = ユーザー追加タスク（テンプレート外）
  };

// ============================================================
// フェーズ別進捗集計
// ============================================================
export type PhaseProgress = {
  phase: Phase;
  total: number;
  completed: number;
  progressRate: number;  // 0-100
};

// ============================================================
// 注目タスク（ダッシュボード用）
// ============================================================
export type AttentionTask = ProjectTaskView & {
  projectId: string;
  projectName: string;
};

// ============================================================
// フィルター状態
// ============================================================
export type FilterState = {
  keyword: string;
  phase: string;        // '' = すべて
  department: string;   // '' = すべて
  status: string;       // '' = すべて
  delayedOnly: boolean;
  milestoneOnly: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  phase: '',
  department: '',
  status: '',
  delayedOnly: false,
  milestoneOnly: false,
};
