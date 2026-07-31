import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Blades, KaneBackground, GOLD_RGB } from "./Composition";

// KaneAI promo — narrated (macOS `say` VO in public/vo.m4a). Every animation is driven by
// useCurrentFrame()+interpolate() (no CSS transitions), per Remotion best practices. Scenes are
// timed with <Sequence> to roughly track the voice-over.

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 1080; // 36s (Samantha VO ≈ 35.3s + short tail)
const GOLD = `rgb(${GOLD_RGB})`;
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Fade + rise in over `dur` frames starting at `start` (local Sequence frame). */
function rise(frame: number, start: number, dur = 16) {
  const opacity = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const y = interpolate(frame, [start, start + dur], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return { opacity, translate: `0px ${y}px` };
}

const center: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "0 8%",
};

// ---- Scene 1 — intro -------------------------------------------------------
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 120], [0, 60], { easing: Easing.linear });
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 28 }}>
      <div style={{ ...rise(frame, 0, 20), rotate: `${spin}deg` }}>
        <Blades size={130} opacity={0.95} blur={0} />
      </div>
      <div
        style={{
          ...rise(frame, 12),
          color: "white",
          fontFamily: FONT,
          fontSize: 92,
          fontWeight: 300,
          letterSpacing: "0.35em",
          paddingLeft: "0.35em",
        }}
      >
        KANEAI
      </div>
      <div style={{ ...rise(frame, 26), color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontSize: 34, fontWeight: 400 }}>
        Autonomous stablecoin agent on Celo
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 2 — tagline -----------------------------------------------------
const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 10 }}>
      <div style={{ ...rise(frame, 0), color: "white", fontFamily: FONT, fontSize: 84, fontWeight: 400, letterSpacing: "-0.02em" }}>
        The model advises.
      </div>
      <div style={{ ...rise(frame, 18), color: GOLD, fontFamily: FONT, fontSize: 84, fontWeight: 500, letterSpacing: "-0.02em" }}>
        Your policy decides.
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 3 — non-custodial + 3 guardrails --------------------------------
const point: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 22,
  color: "rgba(255,255,255,0.9)",
  fontFamily: FONT,
  fontSize: 42,
  fontWeight: 400,
};
const Tick: React.FC = () => (
  <div style={{ width: 10, height: 44, background: GOLD, borderRadius: 2, flex: "none" }} />
);
const SceneGuardrails: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 14%", gap: 40 }}>
      <div style={{ ...rise(frame, 0), color: "white", fontFamily: FONT, fontSize: 60, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 14 }}>
        Your funds never leave your wallet.
      </div>
      <div style={{ ...rise(frame, 40), ...point }}>
        <Tick /> Spending caps
      </div>
      <div style={{ ...rise(frame, 100), ...point }}>
        <Tick /> Allowlisted venues — Aave&nbsp;V3 · Ubeswap
      </div>
      <div style={{ ...rise(frame, 160), ...point }}>
        <Tick /> Every payout locked to your address
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 4 — the boundary ------------------------------------------------
const SceneBoundary: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 18 }}>
      <div style={{ ...rise(frame, 0), color: "white", fontFamily: FONT, fontSize: 66, fontWeight: 400, letterSpacing: "-0.02em", maxWidth: 1300 }}>
        The AI can only act inside your policy.
      </div>
      <div style={{ ...rise(frame, 30), color: "rgba(255,255,255,0.55)", fontFamily: FONT, fontSize: 40, fontWeight: 400 }}>
        The chain enforces the limits — not us.
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 5 — one chat ----------------------------------------------------
const chip: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.25)",
  color: "white",
  fontFamily: FONT,
  fontSize: 40,
  fontWeight: 400,
  padding: "18px 40px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.04)",
};
const SceneOneChat: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 48 }}>
      <div style={{ ...rise(frame, 0), color: "white", fontFamily: FONT, fontSize: 72, fontWeight: 500, letterSpacing: "-0.02em" }}>
        One chat. No twelve tabs.
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        <div style={{ ...rise(frame, 34), ...chip }}>Supply</div>
        <div style={{ ...rise(frame, 52), ...chip }}>Withdraw</div>
        <div style={{ ...rise(frame, 70), ...chip }}>Swap</div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 6 — live --------------------------------------------------------
const SceneLive: React.FC = () => {
  const frame = useCurrentFrame();
  const words = ["Non-custodial", "Bounded by code", "Live on Celo mainnet"];
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 30 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {words.map((w, i) => (
          <div key={w} style={{ ...rise(frame, i * 16), color: i === 2 ? GOLD : "white", fontFamily: FONT, fontSize: 58, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {w}
            {i < 2 ? <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 6px" }}> · </span> : null}
          </div>
        ))}
      </div>
      <div style={{ ...rise(frame, 60), color: "rgba(255,255,255,0.65)", fontFamily: FONT, fontSize: 34 }}>
        kane-ai-celo.vercel.app
      </div>
      <div style={{ ...rise(frame, 78), color: "rgba(255,255,255,0.4)", fontFamily: FONT, fontSize: 26 }}>
        ERC-8004 agent #9749 · x402 pay-per-prompt
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 7 — outro -------------------------------------------------------
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 24], [0.9, 1], { extrapolateRight: "clamp", easing: EASE, output: "perceptual-scale" as never });
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 24 }}>
      <div style={{ ...rise(frame, 0, 20), scale: s }}>
        <Blades size={120} opacity={0.95} blur={0} />
      </div>
      <div style={{ ...rise(frame, 10), color: "white", fontFamily: FONT, fontSize: 76, fontWeight: 400, letterSpacing: "0.12em", paddingLeft: "0.12em" }}>
        KaneAI
      </div>
      <div style={{ ...rise(frame, 24), color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontSize: 30 }}>
        kane-ai-celo.vercel.app
      </div>
    </AbsoluteFill>
  );
};

const KanePromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#04060a" }}>
      {/* brand background, dimmed so text reads */}
      <AbsoluteFill style={{ opacity: 0.55 }}>
        <KaneBackground />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(4,6,10,0.35)" }} />

      {/* subtle ambient bed (no voice-over) — swap public/music.m4a for any track you like */}
      <Audio src={staticFile("music.m4a")} volume={0.7} />

      <Sequence from={0} durationInFrames={105}><SceneIntro /></Sequence>
      <Sequence from={105} durationInFrames={84}><SceneTagline /></Sequence>
      <Sequence from={189} durationInFrames={330}><SceneGuardrails /></Sequence>
      <Sequence from={519} durationInFrames={150}><SceneBoundary /></Sequence>
      <Sequence from={669} durationInFrames={150}><SceneOneChat /></Sequence>
      <Sequence from={819} durationInFrames={135}><SceneLive /></Sequence>
      <Sequence from={954} durationInFrames={126}><SceneOutro /></Sequence>
    </AbsoluteFill>
  );
};

export const KanePromoVideo: React.FC = () => {
  return (
    <Composition
      id="KanePromo"
      component={KanePromo}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
