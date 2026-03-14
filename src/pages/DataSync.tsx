import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { exportAllData, importAllData } from '../storage/projectStorage';
import { useProjectStore } from '../store/useProjectStore';

export function DataSync() {
  const { projects } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── エクスポート ─────────────────────────────────────────
  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plm-backup-${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── インポート ───────────────────────────────────────────
  const handleImportClick = () => {
    setImportMsg(null);
    fileInputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // 同じファイルを再選択できるようにリセット

    if (!window.confirm('現在のデータはすべて上書きされます。続けますか？')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importAllData(ev.target?.result as string);
        setImportMsg({ type: 'ok', text: 'インポートしました。ページを再読み込みします…' });
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportMsg({ type: 'err', text: 'インポートに失敗しました。正しいバックアップファイルを選択してください。' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>データ共有 / バックアップ</h2>
          <div className="breadcrumb">別端末への移行・バックアップ</div>
        </div>
      </div>

      <div className="page-body">
        {/* ── 仕組みの説明 ── */}
        <div className="card mb-16">
          <div className="card-header"><h3>別PCやスマホとデータを共有する方法</h3></div>
          <div className="card-body">
            <div className="sync-steps">
              <div className="sync-step">
                <div className="sync-step-no">1</div>
                <div className="sync-step-body">
                  <div className="sync-step-title">このPC/スマホでエクスポート</div>
                  <div className="sync-step-desc">「バックアップをダウンロード」ボタンを押すと JSONファイルが保存されます。</div>
                </div>
              </div>
              <div className="sync-step-arrow">↓</div>
              <div className="sync-step">
                <div className="sync-step-no">2</div>
                <div className="sync-step-body">
                  <div className="sync-step-title">ファイルを転送する</div>
                  <div className="sync-step-desc">メール・LINEのファイル送信・Googleドライブ・AirDropなど、使いやすい方法でもう一方の端末に送ります。</div>
                </div>
              </div>
              <div className="sync-step-arrow">↓</div>
              <div className="sync-step">
                <div className="sync-step-no">3</div>
                <div className="sync-step-body">
                  <div className="sync-step-title">移行先でインポート</div>
                  <div className="sync-step-desc">「バックアップから復元」ボタンで受け取った JSONファイルを選択します。</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: '10px 14px',
                background: 'var(--yellow-bg)',
                border: '1px solid var(--yellow-border)',
                borderRadius: 'var(--r-md)',
                fontSize: 12,
                color: 'var(--yellow)',
              }}
            >
              ⚠ インポートすると移行先の既存データはすべて上書きされます。大切なデータは先にバックアップを取ってください。
            </div>
          </div>
        </div>

        {/* ── エクスポート ── */}
        <div className="card mb-16">
          <div className="card-header"><h3>📤 バックアップをダウンロード（エクスポート）</h3></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              現在の全案件データ（{projects.length}件）を JSON ファイルとして保存します。
            </p>
            <button className="btn btn-primary" onClick={handleExport}>
              📤 バックアップをダウンロード
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              ファイル名: plm-backup-{format(new Date(), 'yyyyMMdd')}.json
            </div>
          </div>
        </div>

        {/* ── インポート ── */}
        <div className="card mb-16">
          <div className="card-header"><h3>📥 バックアップから復元（インポート）</h3></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              別の端末でエクスポートした JSON ファイルを選択すると、このブラウザのデータに上書き復元されます。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button className="btn btn-outline" onClick={handleImportClick}>
              📥 JSONファイルを選択してインポート
            </button>

            {importMsg && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: importMsg.type === 'ok' ? 'var(--green-bg)' : 'var(--red-bg)',
                  border: `1px solid ${importMsg.type === 'ok' ? 'var(--green-border)' : 'var(--red-border)'}`,
                  borderRadius: 'var(--r-md)',
                  fontSize: 13,
                  color: importMsg.type === 'ok' ? 'var(--green)' : 'var(--red)',
                }}
              >
                {importMsg.type === 'ok' ? '✓ ' : '✕ '}{importMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* ── 自動同期への案内 ── */}
        <div className="card">
          <div className="card-header">
            <h3>🔄 自動同期（将来の拡張）</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              「保存したら自動で全端末に反映」する自動同期には外部データベースが必要です。
              以下の無料サービスを使えば実現できます。
            </p>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>サービス</th>
                  <th>難易度</th>
                  <th>無料枠</th>
                  <th>特徴</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Supabase</strong></td>
                  <td>★★☆</td>
                  <td>あり</td>
                  <td>PostgreSQL + REST API。差し替えが最小限で済む</td>
                </tr>
                <tr>
                  <td><strong>Firebase</strong></td>
                  <td>★★☆</td>
                  <td>あり</td>
                  <td>Googleの NoSQL DB。リアルタイム同期が得意</td>
                </tr>
                <tr>
                  <td><strong>PocketBase</strong></td>
                  <td>★★★</td>
                  <td>セルフホスト</td>
                  <td>自分でサーバーに置くタイプ</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              ※ コードの差し替え箇所は <code>src/storage/projectStorage.ts</code> の1ファイルのみです。
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
