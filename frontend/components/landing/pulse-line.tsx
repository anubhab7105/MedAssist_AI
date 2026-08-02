let gradientCount = 0;

export function PulseLine({ className = "", color }: { className?: string; color?: string }) {
  // Each instance gets a unique gradient id so multiple pulse-lines on one
  // page don't collide.
  const gradientId = `pulse-gradient-${(gradientCount++).toString()}`;

  return (
    <svg
      viewBox="0 0 400 60"
      fill="none"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {!color && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2F6FED" />
            <stop offset="50%" stopColor="#0EA88B" />
            <stop offset="100%" stopColor="#8B7CF6" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M0 30 H120 L136 30 L146 8 L158 52 L170 30 L182 30 L192 18 L200 30 H400"
        stroke={color ?? `url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        className="animate-pulse-line"
      />
    </svg>
  );
}
