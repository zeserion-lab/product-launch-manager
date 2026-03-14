import { create } from 'zustand';
import type { Project, ProjectTask, TaskStatus, CustomProjectTask } from '../types';
import { projectStorage, migrateFromLegacyStore } from '../storage/projectStorage';
import { SAMPLE_PROJECT } from '../data/sampleProject';
import { TASK_TEMPLATES } from '../data/taskTemplates';

function loadInitialProjects(): Project[] {
  migrateFromLegacyStore();
  const saved = projectStorage.loadAll();
  if (saved.length > 0) return saved;
  projectStorage.saveProject(SAMPLE_PROJECT);
  return [SAMPLE_PROJECT];
}

// ── ストア型 ──────────────────────────────────────────────

type ProjectStore = {
  projects: Project[];

  addProject:       (project: Project) => void;
  updateProjectMeta:(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'tasks'>>) => void;
  deleteProject:    (id: string) => void;
  updateLaunchDate: (projectId: string, launchDate: string) => void;

  // テンプレートタスク更新
  updateTask:       (projectId: string, templateId: number, updates: Partial<Omit<ProjectTask, 'templateId'>>) => void;
  updateTaskStatus: (projectId: string, templateId: number, status: TaskStatus) => void;

  // テンプレートタスクの表示/非表示
  hideTask:         (projectId: string, templateId: number) => void;
  restoreTask:      (projectId: string, templateId: number) => void;

  // カスタムタスク操作
  addCustomTask:    (projectId: string, task: Omit<CustomProjectTask, 'id'>) => void;
  updateCustomTask: (projectId: string, taskId: number, updates: Partial<Omit<CustomProjectTask, 'id'>>) => void;
  deleteCustomTask: (projectId: string, taskId: number) => void;
};

// ── ユーティリティ ────────────────────────────────────────

function saveAndReturn(project: Project): Project {
  projectStorage.saveProject(project);
  return project;
}

function stamp(p: Project): Project {
  return { ...p, updatedAt: new Date().toISOString() };
}

// ── ストア実装 ────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: loadInitialProjects(),

  addProject: (project) => {
    projectStorage.saveProject(project);
    set((s) => ({ projects: [...s.projects, project] }));
  },

  updateProjectMeta: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== id ? p : saveAndReturn(stamp({ ...p, ...updates }))
      ),
    })),

  deleteProject: (id) => {
    projectStorage.deleteProject(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  updateLaunchDate: (projectId, launchDate) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : saveAndReturn(stamp({ ...p, launchDate }))
      ),
    })),

  updateTask: (projectId, templateId, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const tasks: ProjectTask[] = p.tasks.map((t) =>
          t.templateId !== templateId ? t : { ...t, ...updates }
        );
        // 完了時に進捗率を100に自動補正
        const finalTasks = tasks.map((t) =>
          t.templateId === templateId && t.status === 'completed' && t.progressRate < 100
            ? { ...t, progressRate: 100 }
            : t
        );
        const updated = stamp({ ...p, tasks: finalTasks });
        projectStorage.saveTasks(projectId, finalTasks);
        return updated;
      }),
    })),

  updateTaskStatus: (projectId, templateId, status) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const tasks: ProjectTask[] = p.tasks.map((t) => {
          if (t.templateId !== templateId) return t;
          return { ...t, status, progressRate: status === 'completed' ? 100 : t.progressRate };
        });
        const updated = stamp({ ...p, tasks });
        projectStorage.saveTasks(projectId, tasks);
        return updated;
      }),
    })),

  // テンプレートタスクを非表示に
  hideTask: (projectId, templateId) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const hidden = [...(p.hiddenTaskIds ?? [])];
        if (!hidden.includes(templateId)) hidden.push(templateId);
        return saveAndReturn(stamp({ ...p, hiddenTaskIds: hidden }));
      }),
    })),

  // 非表示テンプレートタスクを復元
  restoreTask: (projectId, templateId) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const hidden = (p.hiddenTaskIds ?? []).filter((id) => id !== templateId);
        return saveAndReturn(stamp({ ...p, hiddenTaskIds: hidden }));
      }),
    })),

  // カスタムタスクを追加
  addCustomTask: (projectId, task) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const nextId = p.nextCustomTaskId ?? 100;
        const newTask: CustomProjectTask = { ...task, id: nextId };
        const customTasks = [...(p.customTasks ?? []), newTask];
        return saveAndReturn(stamp({ ...p, customTasks, nextCustomTaskId: nextId + 1 }));
      }),
    })),

  // カスタムタスクを更新
  updateCustomTask: (projectId, taskId, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const customTasks = (p.customTasks ?? []).map((t) =>
          t.id !== taskId ? t : { ...t, ...updates }
        );
        return saveAndReturn(stamp({ ...p, customTasks }));
      }),
    })),

  // カスタムタスクを削除
  deleteCustomTask: (projectId, taskId) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const customTasks = (p.customTasks ?? []).filter((t) => t.id !== taskId);
        return saveAndReturn(stamp({ ...p, customTasks }));
      }),
    })),
}));

// ── 新規案件作成ヘルパー ──────────────────────────────────

export function createNewProject(params: {
  name: string;
  productCode?: string;
  description?: string;
  launchDate: string;
}): Project {
  return {
    id:          `proj-${Date.now()}`,
    name:        params.name,
    productCode: params.productCode,
    description: params.description,
    launchDate:  params.launchDate,
    tasks: TASK_TEMPLATES.map((t) => ({
      templateId:   t.id,
      status:       'not_started',
      progressRate: 0,
    })),
    hiddenTaskIds:    [],
    customTasks:      [],
    nextCustomTaskId: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
