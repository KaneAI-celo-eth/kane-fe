/**
 * The KaneAI mark: four quarter-circle blades rotated around the centre, each
 * carved by a concave arc — the agent proposing from four sides, the chain
 * deciding at the centre.
 */
const BLADE = "M128 128 L128 0 A128 128 0 0 0 256 128 Z";

export function KaneMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KaneAI"
      role="img"
    >
      <path d={BLADE} />
      <path d={BLADE} transform="rotate(90 128 128)" />
      <path d={BLADE} transform="rotate(180 128 128)" />
      <path d={BLADE} transform="rotate(270 128 128)" />
    </svg>
  );
}
