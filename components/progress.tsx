export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden bg-navy-950">
      <div className="h-full bg-gold-500" style={{ width: `${value}%` }} />
    </div>
  );
}
