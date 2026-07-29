export function PulseLine({ className = "", color = "#06B6D4" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 400 60"
      fill="none"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 30 H120 L136 30 L146 8 L158 52 L170 30 L182 30 L192 18 L200 30 H400"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        className="animate-pulse-line"
      />
    </svg>
  );
}
