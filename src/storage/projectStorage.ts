import type { Project, ProjectTask, TaskStatus } from '../types';

// ============================================================
// ストレージ抽象層
//
// 設計意図:
//   - project メタ情報と tasks を分離して保存することで、
//     将来のDB化（REST API化）を最小変更で実現できる。
//   - この関数群をAPIコール実装に差し替えるだけでDB化が完了する。
//
// localStorage キー設計:
//   plm:projects          → ProjectMeta[] (tasks を持たないProject)
//   plm:tasks:{projectId} → ProjectTask[]
//
// DB化するときに差し替える箇所: この1ファイルのみ
// ============================================================

const STORAGE_KEYS = {
  PROJECTS: 'plm:projects',
  tasks: (id: string) => `plm:tasks:${id}`,
} as const;

/** タスクを含まない案件メタ情報 */
type ProjectMeta = Omit<Project, 'tasks'>;

// ── ヘルパー ───────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── 公開API ───────────────────────────────────────────────

export const projectStorage = {
  /**
   * 全案件（タスク込み）をロードする。
   * DB化時: GET /api/projects と GET /api/projects/:id/tasks に差し替え
   */
  loadAll(): Project[] {
    const metas = readJSON<ProjectMeta[]>(STORAGE_KEYS.PROJECTS, []);
    return metas.map((meta) => ({
      ...meta,
      tasks: projectStorage.loadTasks(meta.id),
    }));
  },

  /**
   * 特定案件のタスクをロードする。
   * DB化時: GET /api/projects/:id/tasks に差し替え
   */
  loadTasks(projectId: string): ProjectTask[] {
    return readJSON<ProjectTask[]>(STORAGE_KEYS.tasks(projectId), []);
  },

  /**
   * 案件を保存（メタ情報とタスクを分離して保存）。
   * DB化時: PUT /api/projects/:id + PUT /api/projects/:id/tasks に差し替え
   */
  saveProject(project: Project): void {
    const { tasks, ...meta } = project;
    const metas = readJSON<ProjectMeta[]>(STORAGE_KEYS.PROJECTS, []);
    const idx = metas.findIndex((m) => m.id === project.id);
    if (idx >= 0) {
      metas[idx] = meta;
    } else {
      metas.push(meta);
    }
    writeJSON(STORAGE_KEYS.PROJECTS, metas);
    writeJSON(STORAGE_KEYS.tasks(project.id), tasks);
  },

  /**
   * タスクのみを更新する（案件メタ情報は変更しない）。
   * DB化時: PATCH /api/projects/:id/tasks/:templateId に差し替え
   */
  saveTasks(projectId: string, tasks: ProjectTask[]): void {
    writeJSON(STORAGE_KEYS.tasks(projectId), tasks);
  },

  /**
   * 案件を削除する。
   * DB化時: DELETE /api/projects/:id に差し替え
   */
  deleteProject(projectId: string): void {
    const metas = readJSON<ProjectMeta[]>(STORAGE_KEYS.PROJECTS, []);
    writeJSON(
      STORAGE_KEYS.PROJECTS,
      metas.filter((m) => m.id !== projectId)
    );
    localStorage.removeItem(STORAGE_KEYS.tasks(projectId));
  },
};

// ── エクスポート / インポート ──────────────────────────────

/**
 * 全データを JSON 文字列にシリアライズして返す（エクスポート用）。
 * この JSON をファイルに保存し、別デバイスで importAllData() に渡すことで
 * デバイス間のデータ共有が可能になる。
 */
export function exportAllData(): string {
  const projects = projectStorage.loadAll();
  return JSON.stringify(projects, null, 2);
}

/**
 * JSON 文字列から全データを復元する（インポート用）。
 * 既存の plm:* キーをすべて削除してから上書きする。
 * ※ 呼び出し後は window.location.reload() でストアを再初期化すること。
 */
export function importAllData(jsonString: string): void {
  const projects = JSON.parse(jsonString) as Project[];
  if (!Array.isArray(projects)) throw new Error('Invalid format');

  // 既存の plm: キーをすべて削除
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('plm:')) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // 新データを書き込む
  projects.forEach((p) => projectStorage.saveProject(p));
}

// ── 旧データマイグレーション ───────────────────────────────

/**
 * 旧バージョン（v1）のタスク形式。
 * progressRate など新フィールドが存在しない可能性があるため、
 * すべてのフィールドをオプショナルとして扱う。
 */
type LegacyTask = {
  templateId: number;
  status?: string;
  progressRate?: number;
  memo?: string;
  actualStartDate?: string;
  actualEndDate?: string;
};

type LegacyProject = Omit<Project, 'tasks'> & {
  tasks: LegacyTask[];
};

/**
 * 旧 Zustand persist (product-launch-manager-store) からの移行。
 * 新キーにデータがなければ旧データを読み込んで変換する。
 */
export function migrateFromLegacyStore(): void {
  const existing = readJSON<ProjectMeta[]>(STORAGE_KEYS.PROJECTS, []);
  if (existing.length > 0) return; // 新データあり → スキップ

  try {
    const legacy = localStorage.getItem('product-launch-manager-store');
    if (!legacy) return;

    const parsed = JSON.parse(legacy) as { state?: { projects?: LegacyProject[] } };
    const oldProjects = parsed?.state?.projects;
    if (!Array.isArray(oldProjects) || oldProjects.length === 0) return;

    const migrated: Project[] = oldProjects.map((p) => ({
      ...p,
      tasks: p.tasks.map((t): ProjectTask => {
        const status = (t.status ?? 'not_started') as TaskStatus;
        return {
          templateId:      t.templateId,
          status,
          progressRate:    t.progressRate ?? (status === 'completed' ? 100 : 0),
          memo:            t.memo,
          actualStartDate: t.actualStartDate,
          actualEndDate:   t.actualEndDate,
          nameOverride:      undefined,
          departmentOverride: undefined,
          assignee:          undefined,
        };
      }),
    }));

    migrated.forEach((p) => projectStorage.saveProject(p));
  } catch {
    // マイグレーション失敗は無視
  }
}
