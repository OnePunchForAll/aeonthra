type Props = {
  seconds: number;
  className?: string;
};

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function Timer({ seconds, className = "" }: Props) {
  return <time className={`timer-readout ${className}`.trim()}>{formatTime(seconds)}</time>;
}
