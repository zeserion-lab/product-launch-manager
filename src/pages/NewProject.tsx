import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, createNewProject } from '../store/useProjectStore';

export function NewProject() {
  const navigate = useNavigate();
  const { addProject } = useProjectStore();

  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('案件名を入力してください');
      return;
    }
    if (!launchDate) {
      setError('発売目標日を選択してください');
      return;
    }

    const newProject = createNewProject({
      name: name.trim(),
      productCode: productCode.trim() || undefined,
      description: description.trim() || undefined,
      launchDate,
    });

    addProject(newProject);
    navigate(`/projects/${newProject.id}`);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>新規案件登録</h2>
          <div className="breadcrumb">
            <span
              style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
              onClick={() => navigate('/projects')}
            >
              案件一覧
            </span>
            {' ＞ '}新規登録
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header">
            <h3>案件情報</h3>
          </div>
          <div className="card-body">
            {error && (
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  案件名 / 商品名 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="例: 新型ビーズクッション XL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">商品コード（任意）</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="例: BC-XL-2026"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  発売目標日 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                />
                <div className="text-xs text-muted mt-4">
                  ※ 発売日を基準にすべての工程日程が自動計算されます（総リードタイム: 約234日）
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">案件概要（任意）</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="商品のコンセプトや背景などを入力"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary">
                  登録する
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('/projects')}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
