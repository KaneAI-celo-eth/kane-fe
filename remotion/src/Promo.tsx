import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Blades, KaneBackground, GOLD_RGB } from "./Composition";

// KaneAI promo — product-forward visuals: a live console mockup is the centerpiece. All motion is
// driven by useCurrentFrame()/interpolate()/spring() (no CSS transitions), per Remotion best practices.

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 1080; // 36s
const GOLD = `rgb(${GOLD_RGB})`;
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
// brand cut-corner (top-left + bottom-right) — matches the app's btn-cut
const CUT = (r = 12) =>
  `polygon(${r}px 0, 100% 0, 100% calc(100% - ${r}px), calc(100% - ${r}px) 100%, 0 100%, 0 ${r}px)`;

/** Spring entrance → opacity + rise + subtle scale. */
function useAppear(start: number, opts?: { rise?: number; from?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.7 } });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    translate: `0px ${interpolate(p, [0, 1], [opts?.rise ?? 16, 0])}px`,
    scale: interpolate(p, [0, 1], [opts?.from ?? 0.96, 1], { output: "perceptual-scale" as never }),
  };
}

const center: React.CSSProperties = { justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 8%" };

// ---- Scene 1 — intro -------------------------------------------------------
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 90], [0, 45], { easing: Easing.linear });
  const mark = useAppear(0, { from: 0.8, rise: 0 });
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 26 }}>
      <div style={{ ...mark, rotate: `${spin}deg` }}>
        <Blades size={130} opacity={0.95} blur={0} />
      </div>
      <div style={{ ...useAppear(8), color: "white", fontFamily: FONT, fontSize: 96, fontWeight: 300, letterSpacing: "0.35em", paddingLeft: "0.35em" }}>
        KANEAI
      </div>
      <div style={{ ...useAppear(18), color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontSize: 34 }}>
        Autonomous stablecoin agent on Celo
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 2 — tagline -----------------------------------------------------
const SceneTagline: React.FC = () => (
  <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 12 }}>
    <div style={{ ...useAppear(0), color: "white", fontFamily: FONT, fontSize: 88, fontWeight: 400, letterSpacing: "-0.02em" }}>
      The model advises.
    </div>
    <div style={{ ...useAppear(12), color: GOLD, fontFamily: FONT, fontSize: 88, fontWeight: 500, letterSpacing: "-0.02em" }}>
      Your policy decides.
    </div>
  </AbsoluteFill>
);

// ---- Scene 3 — LIVE CONSOLE MOCKUP (centerpiece) ---------------------------
const SceneConsole: React.FC = () => {
  const frame = useCurrentFrame();
  const win = useAppear(0, { from: 0.9, rise: 30 });
  const executed = frame > 150;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...win,
          width: 1280,
          height: 720,
          background: "rgba(9,12,17,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          overflow: "hidden",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* browser chrome */}
        <div style={{ height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#28c840" }} />
          <div style={{ marginLeft: 20, flex: 1, height: 32, background: "rgba(255,255,255,0.06)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontFamily: MONO, fontSize: 18 }}>
            kane-ai-celo.vercel.app/app
          </div>
        </div>

        {/* console body */}
        <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* executor bar */}
          <div style={{ ...useAppear(8), display: "flex", gap: 14, alignItems: "center", border: "1px solid rgba(255,255,255,0.12)", padding: "12px 18px", clipPath: CUT(10) }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: FONT, fontSize: 15, letterSpacing: "0.18em" }}>YOUR EXECUTOR</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: MONO, fontSize: 18 }}>0xBc76bA827e18eB4c910f44eA0cDE6786059C62eD</span>
          </div>

          {/* user bubble */}
          <div style={{ ...useAppear(22, { rise: 8 }), alignSelf: "flex-end", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", padding: "14px 20px", clipPath: CUT(10) }}>
            <span style={{ color: "white", fontFamily: FONT, fontSize: 24 }}>supply 100 USDC into Aave</span>
          </div>

          {/* proposal card */}
          <div style={{ ...useAppear(42, { from: 0.94, rise: 14 }), border: "1px solid rgba(255,255,255,0.25)", padding: "22px 26px", clipPath: CUT(12) }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: FONT, fontSize: 15, letterSpacing: "0.18em", marginBottom: 10 }}>PROPOSED MOVE</div>
            <div style={{ color: "white", fontFamily: FONT, fontSize: 40, fontWeight: 400, letterSpacing: "-0.01em" }}>
              Supply 100 USDC <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 28 }}>→ Aave V3</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "18px 0" }} />
            <div style={{ ...useAppear(66), }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: FONT, fontSize: 15, letterSpacing: "0.18em", marginBottom: 6 }}>YOUR POLICY DECIDES</div>
              <div style={{ color: "white", fontFamily: FONT, fontSize: 24 }}>
                Allowed <span style={{ color: GOLD }}>✓</span> — within your on-chain policy.
              </div>
            </div>
          </div>

          {/* execute button → done */}
          <div style={{ ...useAppear(88, { rise: 8 }), display: "flex", alignItems: "center", gap: 18 }}>
            {!executed ? (
              <div style={{ background: "white", color: "black", fontFamily: FONT, fontSize: 22, fontWeight: 500, padding: "16px 34px", clipPath: CUT(12) }}>
                Approve &amp; Execute
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ color: "white", fontFamily: FONT, fontSize: 24 }}>Done <span style={{ color: GOLD }}>✓</span></div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontFamily: MONO, fontSize: 20 }}>tx 0x77ebfcc7…</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 4 — guardrails (policy gate) ------------------------------------
const guardChip = (extra?: React.CSSProperties): React.CSSProperties => ({
  border: "1px solid rgba(255,255,255,0.2)",
  color: "rgba(255,255,255,0.92)",
  fontFamily: FONT,
  fontSize: 34,
  padding: "20px 30px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  clipPath: CUT(10),
  ...extra,
});
const Tick: React.FC = () => <div style={{ width: 8, height: 34, background: GOLD, borderRadius: 2 }} />;
const SceneGuardrails: React.FC = () => (
  <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 26 }}>
    <div style={{ ...useAppear(0), color: "white", fontFamily: FONT, fontSize: 58, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 16 }}>
      Bounded by an on-chain policy.
    </div>
    <div style={{ ...useAppear(20), ...guardChip() }}><Tick /> Spending caps</div>
    <div style={{ ...useAppear(38), ...guardChip() }}><Tick /> Allowlisted venues — Aave V3 · Ubeswap</div>
    <div style={{ ...useAppear(56), ...guardChip() }}><Tick /> Every payout locked to your address</div>
  </AbsoluteFill>
);

// ---- Scene 5 — one chat ----------------------------------------------------
const SceneOneChat: React.FC = () => {
  const chip = (delay: number, label: string) => (
    <div style={{ ...useAppear(delay, { from: 0.8, rise: 0 }), border: "1px solid rgba(255,255,255,0.25)", color: "white", fontFamily: FONT, fontSize: 40, padding: "18px 44px", clipPath: CUT(10), background: "rgba(255,255,255,0.04)" }}>
      {label}
    </div>
  );
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 44 }}>
      <div style={{ ...useAppear(0), color: "white", fontFamily: FONT, fontSize: 72, fontWeight: 500, letterSpacing: "-0.02em" }}>
        One chat. No twelve tabs.
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        {chip(20, "Supply")}
        {chip(34, "Withdraw")}
        {chip(48, "Swap")}
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 6 — live --------------------------------------------------------
const SceneLive: React.FC = () => {
  const words = ["Non-custodial", "Bounded by code", "Live on mainnet"];
  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 30 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {words.map((w, i) => (
          <div key={w} style={{ ...useAppear(i * 12), color: i === 2 ? GOLD : "white", fontFamily: FONT, fontSize: 58, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {w}{i < 2 ? <span style={{ color: "rgba(255,255,255,0.3)" }}> · </span> : null}
          </div>
        ))}
      </div>
      <div style={{ ...useAppear(46), color: "rgba(255,255,255,0.7)", fontFamily: FONT, fontSize: 36 }}>kane-ai-celo.vercel.app</div>
      <div style={{ ...useAppear(60), color: "rgba(255,255,255,0.42)", fontFamily: FONT, fontSize: 26 }}>
        ERC-8004 agent #9749 · x402 pay-per-prompt
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 7 — outro -------------------------------------------------------
const SceneOutro: React.FC = () => (
  <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 22 }}>
    <div style={useAppear(0, { from: 0.85, rise: 0 })}>
      <Blades size={120} opacity={0.95} blur={0} />
    </div>
    <div style={{ ...useAppear(8), color: "white", fontFamily: FONT, fontSize: 78, fontWeight: 400, letterSpacing: "0.12em", paddingLeft: "0.12em" }}>KaneAI</div>
    <div style={{ ...useAppear(18), color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontSize: 30 }}>kane-ai-celo.vercel.app</div>
  </AbsoluteFill>
);

const KanePromo: React.FC = () => (
  <AbsoluteFill style={{ background: "#04060a" }}>
    <AbsoluteFill style={{ opacity: 0.5 }}><KaneBackground /></AbsoluteFill>
    <AbsoluteFill style={{ background: "rgba(4,6,10,0.4)" }} />

    <Audio src={staticFile("music.m4a")} volume={0.7} />

    <Sequence from={0} durationInFrames={90}><SceneIntro /></Sequence>
    <Sequence from={90} durationInFrames={110}><SceneTagline /></Sequence>
    <Sequence from={200} durationInFrames={360}><SceneConsole /></Sequence>
    <Sequence from={560} durationInFrames={180}><SceneGuardrails /></Sequence>
    <Sequence from={740} durationInFrames={120}><SceneOneChat /></Sequence>
    <Sequence from={860} durationInFrames={140}><SceneLive /></Sequence>
    <Sequence from={1000} durationInFrames={80}><SceneOutro /></Sequence>
  </AbsoluteFill>
);

export const KanePromoVideo: React.FC = () => (
  <Composition id="KanePromo" component={KanePromo} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
