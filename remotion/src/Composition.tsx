import { AbsoluteFill, Composition, random, useCurrentFrame, useVideoConfig } from "remotion";

// ---------------------------------------------------------------------------
// KaneAI background — a calm, dark, Celo-gold field that echoes the four-blade
// KaneAI mark. Every motion is periodic over the composition length, so the
// exported MP4 loops seamlessly behind the landing hero.
// ---------------------------------------------------------------------------

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 300; // 10s loop
const GOLD = "247, 201, 72"; // Celo-ish gold, as an rgb triplet for rgba()

// The logo mark: four quarter-circle blades rotated around the centre.
const BLADE = "M128 128 L128 0 A128 128 0 0 0 256 128 Z";

function Blades({ size, opacity, blur }: { size: number; opacity: number; blur: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill={`rgba(${GOLD}, 1)`}
      style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined }}
    >
      <path d={BLADE} />
      <path d={BLADE} transform="rotate(90 128 128)" />
      <path d={BLADE} transform="rotate(180 128 128)" />
      <path d={BLADE} transform="rotate(270 128 128)" />
    </svg>
  );
}

const PARTICLES = 70;

const KaneBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // t sweeps a full 2π across the loop → sin/cos of it return to their start.
  const t = (frame / durationInFrames) * Math.PI * 2;
  const spin = (frame / durationInFrames) * 360; // full turn per loop

  // Two gold glows breathing in and out of phase.
  const glowA = 0.5 + 0.5 * Math.sin(t);
  const glowB = 0.5 + 0.5 * Math.sin(t + Math.PI * 0.6);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, #10141a 0%, #090c11 45%, #04060a 100%)",
      }}
    >
      {/* breathing gold glows */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 30% 72%, rgba(${GOLD}, 0.15), transparent 55%)`,
          opacity: 0.35 + 0.65 * glowA,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 74% 26%, rgba(${GOLD}, 0.11), transparent 52%)`,
          opacity: 0.35 + 0.65 * glowB,
        }}
      />

      {/* rotating mark — a soft glow copy behind a crisp copy */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `rotate(${spin}deg)`, display: "grid", placeItems: "center" }}>
          <div style={{ gridArea: "1 / 1" }}>
            <Blades size={1500} opacity={0.05} blur={40} />
          </div>
          <div style={{ gridArea: "1 / 1" }}>
            <Blades size={1180} opacity={0.06} blur={0} />
          </div>
        </div>
      </AbsoluteFill>

      {/* counter-rotating concentric rings */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          style={{ transform: `rotate(${-spin}deg)` }}
          fill="none"
          stroke={`rgba(${GOLD}, 0.10)`}
          strokeWidth={1}
        >
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={320} strokeDasharray="2 14" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={460} strokeDasharray="2 22" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={600} strokeDasharray="2 30" />
        </svg>
      </AbsoluteFill>

      {/* drifting, twinkling particles (deterministic) */}
      <AbsoluteFill>
        {Array.from({ length: PARTICLES }).map((_, i) => {
          const bx = random(`px${i}`) * WIDTH;
          const by = random(`py${i}`) * HEIGHT;
          const r = 0.8 + random(`pr${i}`) * 2.4;
          const ax = 15 + random(`pax${i}`) * 45;
          const ay = 15 + random(`pay${i}`) * 45;
          const ph = random(`pph${i}`) * Math.PI * 2;
          const ph2 = random(`pph2${i}`) * Math.PI * 2;
          const tw = random(`ptw${i}`) * Math.PI * 2;
          const isGold = random(`pc${i}`) > 0.6;

          const x = bx + ax * Math.sin(t + ph);
          const y = by + ay * Math.cos(t + ph2);
          const twinkle = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + tw));

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background: isGold ? `rgba(${GOLD}, 1)` : "rgba(230, 237, 243, 1)",
                opacity: twinkle,
                boxShadow: isGold ? `0 0 ${r * 4}px rgba(${GOLD}, 0.7)` : undefined,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* vignette to seat the hero text */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const KaneVideo: React.FC = () => {
  return (
    <Composition
      id="KaneBackground"
      component={KaneBackground}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
