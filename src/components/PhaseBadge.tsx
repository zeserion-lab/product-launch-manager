import type { Phase } from '../types';

type Props = { phase: Phase };

const phaseClassMap: Record<string, string> = {
  '1.企画': 'phase-1',
  '2.試作': 'phase-2',
  '3.仕様': 'phase-3',
  '4.登録': 'phase-4',
  '5.製造': 'phase-5',
  '6.準備': 'phase-6',
  GOAL: 'phase-goal',
};

export function PhaseBadge({ phase }: Props) {
  const cls = phaseClassMap[phase] ?? '';
  return <span className={`phase-badge ${cls}`}>{phase}</span>;
}
