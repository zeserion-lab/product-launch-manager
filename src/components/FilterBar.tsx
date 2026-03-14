import type { FilterState } from '../types';
import { STATUS_LABELS } from './StatusBadge';
import { hasActiveFilter } from '../logic/taskUtils';

type Props = {
  filters: FilterState;
  departments: string[];
  phases: string[];
  filteredCount: number;
  totalCount: number;
  onChange: (f: FilterState) => void;
};

export function FilterBar({
  filters,
  departments,
  phases,
  filteredCount,
  totalCount,
  onChange,
}: Props) {
  const active = hasActiveFilter(filters);

  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });

  const reset = () =>
    onChange({
      keyword: '',
      phase: '',
      department: '',
      status: '',
      delayedOnly: false,
      milestoneOnly: false,
    });

  return (
    <div className="filter-bar">
      <div className="filter-row">
        {/* キーワード検索 */}
        <div className="filter-item filter-keyword">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 タスク名・担当・備考で検索"
            value={filters.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
          />
        </div>

        {/* フェーズ */}
        <div className="filter-item">
          <select
            className="form-control"
            value={filters.phase}
            onChange={(e) => set({ phase: e.target.value })}
          >
            <option value="">フェーズ：すべて</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* 担当部署 */}
        <div className="filter-item">
          <select
            className="form-control"
            value={filters.department}
            onChange={(e) => set({ department: e.target.value })}
          >
            <option value="">担当部署：すべて</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* ステータス */}
        <div className="filter-item">
          <select
            className="form-control"
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="">ステータス：すべて</option>
            {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-row filter-row-checks">
        {/* チェックボックスフィルター */}
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.delayedOnly}
            onChange={(e) => set({ delayedOnly: e.target.checked })}
          />
          <span className="filter-check-label delay">遅延タスクのみ</span>
        </label>

        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.milestoneOnly}
            onChange={(e) => set({ milestoneOnly: e.target.checked })}
          />
          <span className="filter-check-label milestone">重要工程のみ</span>
        </label>

        {/* 件数・リセット */}
        <div className="filter-result">
          <span className="filter-count">
            {active ? (
              <>
                <strong>{filteredCount}</strong> / {totalCount} 件表示
              </>
            ) : (
              <>{totalCount} 件</>
            )}
          </span>
          {active && (
            <button className="btn btn-outline btn-sm" onClick={reset}>
              フィルターをリセット
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
