export function Loader({ className = "" }: { className?: string }) {
  return <div className={`loader ${className}`.trim()} aria-hidden="true" />;
}
