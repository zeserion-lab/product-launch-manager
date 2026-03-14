type Props = {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

function getColor(value: number): string {
  if (value >= 80) return 'success';
  if (value >= 40) return '';
  return '';
}

export function ProgressBar({ value, size = 'md', showLabel = true }: Props) {
  const trackClass = `progress-bar-track${size === 'lg' ? ' lg' : ''}`;
  const fillColor = getColor(value);

  return (
    <div className="progress-bar-wrapper">
      <div className={trackClass}>
        <div
          className={`progress-bar-fill${fillColor ? ` ${fillColor}` : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar-label">{value}%</span>
      )}
    </div>
  );
}
