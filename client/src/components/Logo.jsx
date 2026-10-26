export function Logo({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1F6B45" />
      <path d="M12 30h40a20 20 0 0 1-40 0Z" fill="#D4F06B" />
      <path
        d="M20 22c0-4 4-4 4-8M32 22c0-4 4-4 4-8M44 22c0-4 4-4 4-8"
        stroke="#D4F06B"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
