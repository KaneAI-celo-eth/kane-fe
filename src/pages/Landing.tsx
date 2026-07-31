import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { KaneMark } from "../components/KaneMark";

// Self-hosted, brand-built background loop (see remotion/ — 1920×1080, 10s, seamless).
const VIDEO_SRC = "/kane-bg.mp4";

// "How it works" explainer lives in the org .github repo.
const DOCS_URL = "https://github.com/KaneAI-celo-eth/.github";

export function Landing() {
  return (
    <div className="h-screen w-full bg-black p-3 md:p-4 font-inter">
      {/* Liquid-glass container: rounded, clipped, video sitting behind content */}
      <div className="w-full h-full rounded-2xl flex flex-col overflow-hidden relative bg-black">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover anim-fade"
          style={{ animationDelay: "0.2s" }}
        />

        {/* ------------------------------------------------------------ nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
          <div className="anim-stagger" style={{ animationDelay: "0.1s" }}>
            <KaneMark className="w-14 h-14 md:w-16 md:h-16" />
            <span className="block text-white text-[10px] md:text-xs tracking-[0.4em] mt-1 font-light">
              K A N E A I
            </span>
          </div>

          <div
            className="anim-stagger flex items-center gap-3"
            style={{ animationDelay: "0.2s" }}
          >
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden md:block px-5 py-2.5 text-white text-sm hover:bg-white/10 btn-cut-border"
            >
              <span>How it works</span>
            </a>
            <Link
              to="/app"
              className="hidden md:block px-5 py-2.5 bg-white text-black text-sm hover:bg-white/90 btn-cut"
            >
              Launch Console
            </Link>
          </div>
        </nav>

        {/* --------------------------------------------------------- content */}
        <div className="relative z-10 flex-1 flex flex-col justify-between px-6 md:px-10 pb-8 md:pb-10">
          <div className="flex-1 flex items-center relative">
            {/* left rail */}
            <div
              className="anim-stagger hidden lg:flex flex-col gap-6 absolute left-0 top-[18%]"
              style={{ animationDelay: "0.4s" }}
            >
              <p className="text-white/80 text-base leading-relaxed max-w-[220px]">
                Autonomous
                <br />
                stablecoin agent
                <br />
                on Celo
              </p>

              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full border border-white/40" />
                  <div className="w-4 h-4 rounded-full border border-white/40" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-white/70 text-xs">
                    Non-custodial
                    <br />
                    by design
                  </span>
                  <span className="text-white/50 text-xs">01</span>
                </div>
              </div>
            </div>

            {/* heading */}
            <div
              className="anim-stagger w-full text-center"
              style={{ animationDelay: "0.5s" }}
            >
              <h1
                className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-[1.1] tracking-[-0.04em]"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
              >
                The Model Advises
                <br />
                Your Policy Decides
                <br />
                KaneAI on Celo
              </h1>
            </div>
          </div>

          {/* ------------------------------------------------------ bottom */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mt-8">
            <div
              className="anim-stagger flex items-center justify-center md:justify-end"
              style={{ animationDelay: "0.7s" }}
            >
              <p className="text-white text-sm leading-relaxed max-w-[260px] text-center md:text-left md:ml-auto">
                An AI agent proposes each move; your deterministic on-chain
                policy decides whether it runs. Your funds never leave your wallet.
              </p>
            </div>

            <div
              className="anim-stagger flex flex-col items-center gap-8 md:gap-24"
              style={{ animationDelay: "0.85s" }}
            >
              <span className="text-white text-2xl md:text-3xl font-medium">
                Bounded by code
              </span>
              <Link
                to="/app"
                className="w-full max-w-[280px] py-3.5 bg-white flex items-center justify-center gap-2 text-black hover:bg-white/90 transition-colors group btn-cut"
              >
                <span className="text-sm font-medium">Get started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* right column kept empty (social links removed) so the CTA stays centered */}
            <div aria-hidden className="hidden md:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
