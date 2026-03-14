import { useState } from 'react';
import type { ProjectTaskView, ProjectTask, TaskStatus } from '../types';
import { STATUS_LABELS } from './StatusBadge';
import { formatDate } from '../logic/scheduleCalc';
import { TASK_TEMPLATES } from '../data/taskTemplates';

// ProjectTaskの更新フィールド + カスタムタスク用の拡張フィールド
export type TaskEditUpdates = Partial<Omit<ProjectTask, 'templateId'>> & {
  name?: string;               // テンプレート → nameOverride、カスタム → name として保存
  plannedStartDate?: string;   // カスタムタスクの予定開始日
  plannedEndDate?: string;     // カスタムタスクの予定完了日
};

type Props = {
  task: ProjectTaskView;
  onSave:   (updates: TaskEditUpdates) => void;
  onDelete: () => void;
  onClose:  () => void;
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [TaskStatus, string][];

const DEPARTMENT_LIST = Array.from(
  new Set(TASK_TEMPLATES.map((t) => t.department))
).sort();

export function TaskEditPanel({ task, onSave, onDelete, onClose }: Props) {
  const templateDept =
    TASK_TEMPLATES.find((t) => t.id === task.templateId)?.department ?? task.department;

  const [form, setForm] = useState({
    name:               task.nameOverride ?? task.name,
    status:             task.status,
    progressRate:       task.progressRate,
    memo:               task.memo ?? '',
    actualStartDate:    task.actualStartDate ?? '',
    actualEndDate:      task.actualEndDate ?? '',
    departmentOverride: task.departmentOverride ?? task.department,
    assignee:           task.assignee ?? '',
    // カスタムタスク用
    plannedStartDate:   formatDate(task.startDate),
    plannedEndDate:     formatDate(task.endDate),
  });

  const set = (partial: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const handleSave = () => {
    const dept = form.departmentOverride.trim();
    const updates: TaskEditUpdates = {
      name:            form.name.trim() || task.name,
      status:          form.status,
      progressRate:    Math.max(0, Math.min(100, form.progressRate)),
      memo:            form.memo.trim() || undefined,
      actualStartDate: form.actualStartDate || undefined,
      actualEndDate:   form.actualEndDate || undefined,
      departmentOverride:
        dept && dept !== templateDept ? dept : undefined,
      assignee: form.assignee.trim() || undefined,
    };
    if (updates.status === 'completed') updates.progressRate = 100;
    if (task.isCustom) {
      updates.plannedStartDate = form.plannedStartDate || undefined;
      updates.plannedEndDate   = form.plannedEndDate   || undefined;
    }
    onSave(updates);
    onClose();
  };

  const handleDelete = () => {
    const label = task.isCustom ? 'このカスタムタスクを削除' : 'このタスクを非表示に';
    if (window.confirm(`${label}しますか？`)) {
      onDelete();
      onClose();
    }
  };

  const handleStatusChange = (status: TaskStatus) =>
    set({ status, progressRate: status === 'completed' ? 100 : form.progressRate });

  const isOverridden = form.departmentOverride !== templateDept;

  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, background: '#EFF6FF' }}>
        <div className="task-edit-panel">
          {/* ヘッダー */}
          <div className="edit-panel-header">
            <div className="edit-panel-title">
              <span className="task-no-lg" style={{ background: task.isCustom ? '#7C3AED' : undefined }}>
                {task.id}
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className="form-control"
                style={{ width: 300, fontWeight: 600 }}
                placeholder="タスク名を入力"
              />
              {!task.isCustom && form.name !== task.name && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => set({ name: TASK_TEMPLATES.find(t => t.id === task.id)?.name ?? task.name })}
                  title="元のタスク名に戻す"
                >
                  ↩ リセット
                </span>
              )}
              <span className="text-muted text-sm">
                予定: {formatDate(task.startDate)} 〜 {formatDate(task.endDate)}
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
          </div>

          {/* 編集グリッド */}
          <div className="edit-panel-grid">
            {/* ステータス */}
            <div className="form-group">
              <label className="form-label">ステータス</label>
              <div className="status-radio-group">
                {STATUS_OPTIONS.map(([val, label]) => (
                  <label
                    key={val}
                    className={`status-radio ${form.status === val ? 'selected' : ''} ${val}`}
                  >
                    <input
                      type="radio" name="status" value={val}
                      checked={form.status === val}
                      onChange={() => handleStatusChange(val)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* 進捗率 */}
            <div className="form-group">
              <label className="form-label">
                進捗率: <strong>{form.progressRate}%</strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range" min={0} max={100} step={5}
                  value={form.progressRate} className="progress-range"
                  onChange={(e) => set({ progressRate: Number(e.target.value) })}
                  disabled={form.status === 'completed'}
                />
                <input
                  type="number" min={0} max={100}
                  value={form.progressRate} className="form-control" style={{ width: 70 }}
                  onChange={(e) => set({ progressRate: Number(e.target.value) })}
                  disabled={form.status === 'completed'}
                />
              </div>
            </div>

            {/* 担当部署 */}
            <div className="form-group">
              <label className="form-label">
                担当部署
                {!task.isCustom && isOverridden && (
                  <span
                    style={{ marginLeft: 6, fontSize: 10, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => set({ departmentOverride: templateDept })}
                    title="テンプレートの担当部署に戻す"
                  >
                    ↩ リセット
                  </span>
                )}
              </label>
              <input
                type="text" list="dept-list-edit" className="form-control"
                value={form.departmentOverride} placeholder={templateDept}
                onChange={(e) => set({ departmentOverride: e.target.value })}
              />
              <datalist id="dept-list-edit">
                {DEPARTMENT_LIST.map((d) => <option key={d} value={d} />)}
              </datalist>
              {!task.isCustom && isOverridden && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  標準: {templateDept}
                </div>
              )}
            </div>

            {/* 担当者名 */}
            <div className="form-group">
              <label className="form-label">担当者名</label>
              <input
                type="text" className="form-control"
                value={form.assignee} placeholder="例: 山田 太郎"
                onChange={(e) => set({ assignee: e.target.value })}
              />
            </div>

            {/* カスタムタスクのみ: 予定日 */}
            {task.isCustom && (
              <>
                <div className="form-group">
                  <label className="form-label">予定開始日</label>
                  <input
                    type="date" className="form-control"
                    value={form.plannedStartDate}
                    onChange={(e) => set({ plannedStartDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">予定完了日</label>
                  <input
                    type="date" className="form-control"
                    value={form.plannedEndDate}
                    onChange={(e) => set({ plannedEndDate: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* テンプレートタスク: 実績日 */}
            {!task.isCustom && (
              <>
                <div className="form-group">
                  <label className="form-label">実績開始日</label>
                  <input
                    type="date" className="form-control"
                    value={form.actualStartDate}
                    onChange={(e) => set({ actualStartDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">実績完了日</label>
                  <input
                    type="date" className="form-control"
                    value={form.actualEndDate}
                    onChange={(e) => set({ actualEndDate: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* メモ（全幅） */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">メモ・備考</label>
              <textarea
                className="form-control" rows={2}
                value={form.memo}
                onChange={(e) => set({ memo: e.target.value })}
                placeholder="進捗メモ・懸念事項・引継ぎ情報など"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* フッター */}
          <div className="edit-panel-footer">
            <button className="btn btn-primary btn-sm" onClick={handleSave}>保存する</button>
            <button className="btn btn-outline btn-sm" onClick={onClose}>キャンセル</button>
            <div style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                title={task.isCustom ? 'カスタムタスクを削除' : 'テンプレートタスクを非表示に'}
              >
                🗑 {task.isCustom ? 'タスクを削除' : 'タスクを非表示'}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
