import type { Project } from '../types';
import { TASK_TEMPLATES } from './taskTemplates';

/**
 * サンプル案件データ（秋発売想定）
 * 今日(2026-03-14)時点で企画フェーズ完了・試作フェーズ進行中という設定
 */
export const SAMPLE_PROJECT: Project = {
  id: 'proj-001',
  name: '新型ビーズクッション XL',
  productCode: 'BC-XL-2026',
  description: '既存Mサイズの後継モデル。ボリューム感と収納性を両立した新シリーズ。',
  launchDate: '2026-10-01',
  tasks: TASK_TEMPLATES.map((t) => {
    if (t.id === 1) return { templateId: t.id, status: 'completed', progressRate: 100, memo: '競合他社データを活用。', actualStartDate: '2026-02-10', actualEndDate: '2026-02-23' };
    if (t.id === 2) return { templateId: t.id, status: 'completed', progressRate: 100, actualStartDate: '2026-02-24', actualEndDate: '2026-03-02' };
    if (t.id === 3) return { templateId: t.id, status: 'completed', progressRate: 100, actualStartDate: '2026-03-03', actualEndDate: '2026-03-05' };
    if (t.id === 4) return { templateId: t.id, status: 'completed', progressRate: 100, memo: 'ロゴ規定の最終確認済み。', actualStartDate: '2026-03-06', actualEndDate: '2026-03-12' };
    if (t.id === 5) return { templateId: t.id, status: 'in_progress', progressRate: 40, memo: '工場へ発注済み。春節明け対応中。' };
    return { templateId: t.id, status: 'not_started', progressRate: 0 };
  }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
