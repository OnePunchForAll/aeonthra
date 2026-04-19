export function ProgressBar({
  value,
  className = ""
}: {
  value: number;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress ${className}`.trim()} aria-hidden="true">
      <div className="progress__fill" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
