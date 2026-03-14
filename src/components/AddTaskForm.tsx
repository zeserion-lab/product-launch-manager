import { useState } from 'react';
import { format, addDays } from 'date-fns';
import type { Phase, TaskStatus, CustomProjectTask } from '../types';
import { PHASE_ORDER } from '../data/taskTemplates';
import { TASK_TEMPLATES } from '../data/taskTemplates';

type Props = {
  onAdd:    (task: Omit<CustomProjectTask, 'id'>) => void;
  onCancel: () => void;
};

const DEPARTMENT_LIST = Array.from(
  new Set(TASK_TEMPLATES.map((t) => t.department))
).sort();

const today = format(new Date(), 'yyyy-MM-dd');
const weekLater = format(addDays(new Date(), 7), 'yyyy-MM-dd');

export function AddTaskForm({ onAdd, onCancel }: Props) {
  const [form, setForm] = useState({
    name:             '',
    phase:            '1.企画' as Phase,
    department:       '',
    notes:            '',
    plannedStartDate: today,
    plannedEndDate:   weekLater,
    assignee:         '',
  });
  const [error, setError] = useState('');

  const set = (partial: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const handleAdd = () => {
    if (!form.name.trim()) { setError('タスク名を入力してください'); return; }
    if (!form.plannedStartDate || !form.plannedEndDate) { setError('予定日を入力してください'); return; }
    if (form.plannedEndDate < form.plannedStartDate) { setError('完了日は開始日以降にしてください'); return; }

    const start = new Date(form.plannedStartDate);
    const end   = new Date(form.plannedEndDate);
    const days  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    onAdd({
      phase:             form.phase,
      name:              form.name.trim(),
      department:        form.department.trim() || 'ー',
      notes:             form.notes.trim(),
      days,
      isMilestone:       false,
      status:            'not_started' as TaskStatus,
      progressRate:      0,
      assignee:          form.assignee.trim() || undefined,
      plannedStartDate:  form.plannedStartDate,
      plannedEndDate:    form.plannedEndDate,
    });
  };

  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, background: '#F5F3FF' }}>
        <div className="task-edit-panel" style={{ borderColor: '#DDD6FE', background: '#F5F3FF' }}>
          <div className="edit-panel-header" style={{ borderColor: '#DDD6FE' }}>
            <div className="edit-panel-title">
              <span className="task-no-lg" style={{ background: '#7C3AED' }}>＋</span>
              <strong>新規タスクを追加</strong>
              <span className="text-xs text-muted">
                ※ 追加タスクは手動で予定日を設定します
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onCancel}>✕</button>
          </div>

          {error && (
            <div style={{ margin: '8px 0', padding: '6px 12px', background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div className="edit-panel-grid">
            {/* タスク名 */}
            <div className="form-group" style={{ gridColumn: '1 / 3' }}>
              <label className="form-label">タスク名 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text" className="form-control"
                value={form.name} placeholder="例: 追加品質確認"
                onChange={(e) => set({ name: e.target.value })}
                autoFocus
              />
            </div>

            {/* フェーズ */}
            <div className="form-group">
              <label className="form-label">フェーズ <span style={{ color: 'red' }}>*</span></label>
              <select
                className="form-control"
                value={form.phase}
                onChange={(e) => set({ phase: e.target.value as Phase })}
              >
                {PHASE_ORDER.filter(p => p !== 'GOAL').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 担当部署 */}
            <div className="form-group">
              <label className="form-label">担当部署</label>
              <input
                type="text" list="dept-list-add" className="form-control"
                value={form.department} placeholder="担当部署を選択または入力"
                onChange={(e) => set({ department: e.target.value })}
              />
              <datalist id="dept-list-add">
                {DEPARTMENT_LIST.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>

            {/* 予定開始日 */}
            <div className="form-group">
              <label className="form-label">予定開始日 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="date" className="form-control"
                value={form.plannedStartDate}
                onChange={(e) => set({ plannedStartDate: e.target.value })}
              />
            </div>

            {/* 予定完了日 */}
            <div className="form-group">
              <label className="form-label">予定完了日 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="date" className="form-control"
                value={form.plannedEndDate}
                onChange={(e) => set({ plannedEndDate: e.target.value })}
              />
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

            {/* 備考 */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">備考</label>
              <input
                type="text" className="form-control"
                value={form.notes} placeholder="タスクの詳細・注意事項など"
                onChange={(e) => set({ notes: e.target.value })}
              />
            </div>
          </div>

          <div className="edit-panel-footer" style={{ borderColor: '#DDD6FE' }}>
            <button
              className="btn btn-sm"
              style={{ background: '#7C3AED', color: '#fff', borderColor: '#6D28D9' }}
              onClick={handleAdd}
            >
              ＋ タスクを追加
            </button>
            <button className="btn btn-outline btn-sm" onClick={onCancel}>キャンセル</button>
          </div>
        </div>
      </td>
    </tr>
  );
}
