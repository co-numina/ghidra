"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ── Constants ──────────────────────────────────────────────────────────

const CA = "PASTE_CA_HERE";

const HEX_LINES = [
  { addr: "00401000", bytes: "55 89 e5 83 ec 18", asm: "push   ebp; mov ebp,esp; sub esp,0x18" },
  { addr: "00401003", bytes: "c7 45 f4 00 00 00 00", asm: "mov    DWORD PTR [ebp-0xc],0x0" },
  { addr: "0040100a", bytes: "c7 45 f0 01 00 00 00", asm: "mov    DWORD PTR [ebp-0x10],0x1" },
  { addr: "00401011", bytes: "83 7d f0 0a", asm: "cmp    DWORD PTR [ebp-0x10],0xa" },
  { addr: "00401015", bytes: "7f 12", asm: "jg     0x401029" },
  { addr: "00401017", bytes: "8b 45 f0", asm: "mov    eax,DWORD PTR [ebp-0x10]" },
  { addr: "0040101a", bytes: "01 45 f4", asm: "add    DWORD PTR [ebp-0xc],eax" },
  { addr: "0040101d", bytes: "83 45 f0 01", asm: "add    DWORD PTR [ebp-0x10],0x1" },
  { addr: "00401021", bytes: "eb ee", asm: "jmp    0x401011" },
  { addr: "00401023", bytes: "8b 45 f4", asm: "mov    eax,DWORD PTR [ebp-0xc]" },
  { addr: "00401026", bytes: "c9 c3", asm: "leave; ret" },
];

const DECOMPILED_LINES = [
  { text: "int compute_sum(void) {", indent: 0, delay: 800 },
  { text: "int sum = 0;", indent: 1, delay: 1200 },
  { text: "int i = 1;", indent: 1, delay: 1500 },
  { text: "", indent: 0, delay: 1700 },
  { text: "while (i <= 10) {", indent: 1, delay: 2000 },
  { text: "sum += i;", indent: 2, delay: 2400 },
  { text: "i++;", indent: 2, delay: 2700 },
  { text: "}", indent: 1, delay: 3000 },
  { text: "", indent: 0, delay: 3200 },
  { text: "return sum;", indent: 1, delay: 3500 },
  { text: "}", indent: 0, delay: 3800 },
];

const SAMPLE_BINARIES = [
  { name: "libcrypto.so.3", arch: "x86_64", size: "4.2 MB", functions: 2847 },
  { name: "ntoskrnl.exe", arch: "amd64", size: "11.8 MB", functions: 18432 },
  { name: "firmware.bin", arch: "ARM32", size: "892 KB", functions: 341 },
];

const STATS = [
  { label: "Binaries Analyzed", value: 847291, suffix: "", format: true },
  { label: "Functions Decompiled", value: 12400000, suffix: "", format: true },
  { label: "Avg. Decompilation", value: 1.3, suffix: "s", format: false },
  { label: "Supported Architectures", value: 16, suffix: "", format: false },
];

// ── CFG data for the animated graph ────────────────────────────────────
const CFG_NODES = [
  { id: "entry", x: 200, y: 30, label: "entry", w: 80 },
  { id: "init", x: 200, y: 100, label: "sum=0; i=1", w: 100 },
  { id: "cmp", x: 200, y: 180, label: "i <= 10?", w: 90 },
  { id: "body", x: 100, y: 260, label: "sum+=i; i++", w: 110 },
  { id: "exit", x: 300, y: 260, label: "return sum", w: 100 },
];
const CFG_EDGES: [string, string, string][] = [
  ["entry", "init", ""],
  ["init", "cmp", ""],
  ["cmp", "body", "true"],
  ["cmp", "exit", "false"],
  ["body", "cmp", "loop"],
];

const ACCESS_TIERS = [
  { tier: "Public", tokens: "0", calls: "5/day", features: "x86 only, 1MB max", color: "#52525b" },
  { tier: "Analyst", tokens: "10K", calls: "200/day", features: "All archs, 10MB max, batch API", color: "#71717a" },
  { tier: "Operator", tokens: "100K", calls: "2,000/day", features: "Priority queue, 50MB, scripting", color: "#a1a1aa" },
  { tier: "Core", tokens: "500K", calls: "Unlimited", features: "Dedicated instance, custom plugins", color: "#fafafa" },
];

const FAQS = [
  {
    q: "What is this?",
    a: "A hosted decompilation service powered by Ghidra, NSA's open-source reverse engineering framework. Submit binaries via API, receive decompiled C source. Token holders get access tiers based on wallet balance.",
  },
  {
    q: "Why is this a token?",
    a: "Binary analysis is compute-intensive. Each decompilation session costs real infrastructure. Token balance = API key. No subscriptions, no KYC, no accounts. Your wallet is your identity and your access tier.",
  },
  {
    q: "Is this affiliated with the NSA?",
    a: "No. Ghidra is an open-source project released by NSA under the Apache 2.0 license. Anyone can build services on top of it. We provide hosted infrastructure and an API layer — the decompilation engine is theirs.",
  },
  {
    q: "What can I analyze?",
    a: "ELF, PE, Mach-O, raw firmware. x86, x64, ARM, MIPS, PowerPC, RISC-V, and 10 more architectures. Upload via API or web interface. Results include decompiled C, control flow graphs, cross-references, and symbol tables.",
  },
  {
    q: "What about vulnerability bounties?",
    a: "Submit verified vulnerability discoveries found through the service. Bounties paid in $GHIDRA from the protocol treasury. Severity determines payout: Critical (50K), High (20K), Medium (5K).",
  },
  {
    q: "How is this different from running Ghidra locally?",
    a: "Speed and scale. Local Ghidra on a laptop takes minutes per binary. Our cluster decompiles in 1.3s average. Batch API lets you submit thousands of binaries. Plus scripting, custom plugins, and persistent analysis databases.",
  },
];

// ── Components ─────────────────────────────────────────────────────────

// ── Animated Counter ───────────────────────────────────────────────────
function AnimatedStat({ value, suffix, label, format }: { value: number; suffix: string; label: string; format: boolean }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 2000;
        const step = 16;
        const inc = value / (dur / step);
        let cur = 0;
        const iv = setInterval(() => {
          cur += inc;
          if (cur >= value) { cur = value; clearInterval(iv); }
          const v = format ? Math.floor(cur).toLocaleString() : Number.isInteger(value) ? Math.floor(cur).toString() : cur.toFixed(1);
          setDisplay(v);
        }, step);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, format]);

  return (
    <div ref={ref} className="px-5 py-5 rounded-lg bg-zinc-900/50 border border-zinc-800">
      <p className="text-2xl font-semibold text-zinc-100 mono mb-1">{display}{suffix}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

// ── Control Flow Graph ────────────────────────────────────────────────
function CFGVisualization() {
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [visibleEdges, setVisibleEdges] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        CFG_NODES.forEach((_, i) => {
          setTimeout(() => setVisibleNodes(i + 1), i * 300);
        });
        CFG_EDGES.forEach((_, i) => {
          setTimeout(() => setVisibleEdges(i + 1), CFG_NODES.length * 300 + i * 250);
        });
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getNodeById = (id: string) => CFG_NODES.find(n => n.id === id)!;

  return (
    <div ref={ref} className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-500">Control Flow Graph — compute_sum</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60"></span>
          <span className="text-xs text-zinc-600 mono">CFG</span>
        </div>
      </div>
      <svg viewBox="0 0 400 340" className="w-full h-auto" style={{ maxHeight: 340 }}>
        {/* Edges */}
        {CFG_EDGES.map(([from, to, lbl], i) => {
          if (i >= visibleEdges) return null;
          const a = getNodeById(from);
          const b = getNodeById(to);
          const isLoop = lbl === "loop";
          if (isLoop) {
            // curved back-edge
            return (
              <g key={i}>
                <path
                  d={`M ${a.x - a.w/2} ${a.y + 15} C ${a.x - 80} ${a.y + 40}, ${b.x - 80} ${b.y - 20}, ${b.x - b.w/2} ${b.y}`}
                  fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,3"
                  className="cfg-edge"
                />
                <text x={a.x - 75} y={(a.y + b.y) / 2 + 20} className="text-[9px] fill-purple-400/60 mono">loop</text>
              </g>
            );
          }
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y + 18} x2={b.x} y2={b.y - 18}
                stroke={lbl === "true" ? "#4ade80" : lbl === "false" ? "#f87171" : "#52525b"}
                strokeWidth="1.5" className="cfg-edge" />
              {lbl && (
                <text x={(a.x + b.x) / 2 + (lbl === "true" ? -20 : 10)} y={(a.y + b.y) / 2 + 5}
                  className={`text-[9px] mono ${lbl === "true" ? "fill-emerald-400/60" : "fill-red-400/60"}`}>{lbl}</text>
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {CFG_NODES.map((node, i) => {
          if (i >= visibleNodes) return null;
          return (
            <g key={node.id} className="cfg-node">
              <rect x={node.x - node.w / 2} y={node.y - 15} width={node.w} height={30}
                rx="4" fill="#18181b" stroke={node.id === "cmp" ? "#a78bfa" : "#3f3f46"} strokeWidth="1" />
              <text x={node.x} y={node.y + 4} textAnchor="middle"
                className="text-[10px] fill-zinc-300 mono">{node.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Hex Rain Background ───────────────────────────────────────────────
function HexRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const chars = "0123456789abcdef";
    const columns = Math.floor(canvas.width / 14);
    const drops = Array.from({ length: columns }, () => Math.random() * -100);

    const draw = () => {
      ctx.fillStyle = "rgba(9,9,11,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "10px monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const alpha = 0.03 + Math.random() * 0.04;
        ctx.fillStyle = `rgba(161,161,170,${alpha})`;
        ctx.fillText(char, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i] += 0.3 + Math.random() * 0.2;
      }
    };

    const interval = setInterval(draw, 60);
    return () => { clearInterval(interval); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-60" />
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors text-sm mono cursor-pointer"
    >
      {label && <span className="text-zinc-400 text-xs hidden sm:inline">{label}</span>}
      <span className="text-zinc-300 text-xs">{text.length > 20 ? text.slice(0, 6) + "..." + text.slice(-4) : text}</span>
      <span className="text-zinc-500 text-xs">{copied ? "copied" : "copy"}</span>
    </button>
  );
}

function TopBar() {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <span className="mono text-sm font-bold text-zinc-300">G</span>
          </div>
          <span className="font-semibold text-zinc-200 text-sm tracking-tight">$GHIDRA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-xs text-zinc-500">
          <a href="#origin" className="hover:text-zinc-300 transition-colors">Origin</a>
          <a href="#demo" className="hover:text-zinc-300 transition-colors">Demo</a>
          <a href="#access" className="hover:text-zinc-300 transition-colors">Access</a>
          <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
          <Link href="/docs" className="hover:text-zinc-300 transition-colors">Docs</Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <CopyButton text={CA} label="CA" />
        <a
          href="https://pump.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors"
        >
          pump.fun
        </a>
        <a
          href="https://dexscreener.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors hidden sm:block"
        >
          DexScreener
        </a>
      </div>
    </header>
  );
}

function OriginSection() {
  return (
    <section id="origin" className="px-5 py-14 md:px-10 max-w-6xl mx-auto">
      <div className="border border-zinc-800 rounded-lg p-6 md:p-8 bg-zinc-900/50">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Origin</p>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">
              Built on Ghidra by the National Security Agency
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
              Ghidra is a software reverse engineering framework developed by NSA Research.
              Released as open source in 2019, it has become the industry standard for
              binary analysis — used by security researchers, malware analysts, and CTF
              teams worldwide. We wrapped it in hosted infrastructure and an API layer.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[200px]">
            <a
              href="https://github.com/NationalSecurityAgency/ghidra"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <div>
                <p className="text-sm text-zinc-200">NationalSecurityAgency/ghidra</p>
                <p className="text-xs text-zinc-500">53,000+ stars — Apache 2.0</p>
              </div>
            </a>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500">Language</p>
                <p className="text-sm text-zinc-300 mono">Java</p>
              </div>
              <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500">First Release</p>
                <p className="text-sm text-zinc-300 mono">2019</p>
              </div>
              <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500">Contributors</p>
                <p className="text-sm text-zinc-300 mono">300+</p>
              </div>
              <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500">License</p>
                <p className="text-sm text-zinc-300 mono">Apache 2.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DecompilationDemo() {
  const [running, setRunning] = useState(false);
  const [hexVisible, setHexVisible] = useState(0);
  const [decompiledVisible, setDecompiledVisible] = useState(0);
  const [selectedBinary, setSelectedBinary] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runDemo = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setRunning(true);
    setHexVisible(0);
    setDecompiledVisible(0);

    // Animate hex lines appearing
    HEX_LINES.forEach((_, i) => {
      const t = setTimeout(() => setHexVisible(i + 1), i * 150);
      timerRef.current.push(t);
    });

    // Animate decompiled lines appearing after hex
    DECOMPILED_LINES.forEach((line, i) => {
      const t = setTimeout(() => setDecompiledVisible(i + 1), line.delay + HEX_LINES.length * 150);
      timerRef.current.push(t);
    });

    const t = setTimeout(() => setRunning(false), 4500);
    timerRef.current.push(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(runDemo, 1000);
    return () => {
      clearTimeout(t);
      timerRef.current.forEach(clearTimeout);
    };
  }, [runDemo]);

  return (
    <section id="demo" className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Interactive Demo</p>
          <h2 className="text-xl font-semibold text-zinc-100">Binary → Decompiled Source</h2>
        </div>
        <button
          onClick={runDemo}
          disabled={running}
          className="px-4 py-2 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {running ? "Analyzing..." : "Run Decompilation"}
        </button>
      </div>

      {/* Binary selector */}
      <div className="flex gap-2 mb-4">
        {SAMPLE_BINARIES.map((bin, i) => (
          <button
            key={bin.name}
            onClick={() => { setSelectedBinary(i); runDemo(); }}
            className={`px-3 py-2 text-xs rounded border transition-colors cursor-pointer ${
              selectedBinary === i
                ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400"
            }`}
          >
            <span className="mono">{bin.name}</span>
            <span className="text-zinc-600 ml-2">{bin.arch}</span>
          </button>
        ))}
      </div>

      {/* Split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-zinc-800 rounded-lg overflow-hidden">
        {/* Left: Hex/Assembly */}
        <div className="bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs text-zinc-500">Disassembly — {SAMPLE_BINARIES[selectedBinary].name}</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></span>
              <span className="text-xs text-zinc-600 mono">.text</span>
            </div>
          </div>
          <div className="p-4 h-[340px] overflow-y-auto">
            <table className="w-full text-xs mono">
              <thead>
                <tr className="text-zinc-600">
                  <th className="text-left pr-4 pb-2 font-normal">Address</th>
                  <th className="text-left pr-4 pb-2 font-normal">Bytes</th>
                  <th className="text-left pb-2 font-normal">Instruction</th>
                </tr>
              </thead>
              <tbody>
                {HEX_LINES.map((line, i) => (
                  <tr
                    key={i}
                    className="hex-line"
                    style={{
                      animationDelay: `${i * 150}ms`,
                      opacity: i < hexVisible ? 1 : 0,
                      animationFillMode: "forwards",
                    }}
                  >
                    <td className="pr-4 py-0.5 text-zinc-500">{line.addr}</td>
                    <td className="pr-4 py-0.5 text-amber-400/70">{line.bytes}</td>
                    <td className="py-0.5 text-zinc-300">{line.asm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Decompiled C */}
        <div className="bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs text-zinc-500">Decompiled Output</span>
            <div className="flex items-center gap-2">
              {decompiledVisible > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60"></span>}
              <span className="text-xs text-zinc-600 mono">C</span>
            </div>
          </div>
          <div className="p-4 h-[340px] overflow-y-auto">
            <pre className="text-xs leading-6">
              {DECOMPILED_LINES.map((line, i) => (
                <div
                  key={i}
                  className="decompiled-line"
                  style={{
                    paddingLeft: `${line.indent * 20}px`,
                    animationDelay: `${line.delay + HEX_LINES.length * 150}ms`,
                    opacity: i < decompiledVisible ? 1 : 0,
                    animationFillMode: "forwards",
                  }}
                >
                  <span className={line.text.includes("int ") || line.text.includes("return ") || line.text.includes("while ") ? "text-blue-400/80" : "text-zinc-300"}>
                    {line.text}
                  </span>
                </div>
              ))}
            </pre>
            {decompiledVisible >= DECOMPILED_LINES.length && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Decompilation complete — {SAMPLE_BINARIES[selectedBinary].functions.toLocaleString()} functions recovered
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="px-4 py-3 rounded bg-zinc-900/50 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Input Format</p>
          <p className="text-sm text-zinc-300 mono">ELF / PE / Mach-O</p>
        </div>
        <div className="px-4 py-3 rounded bg-zinc-900/50 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Decompiler</p>
          <p className="text-sm text-zinc-300 mono">Ghidra 11.3</p>
        </div>
        <div className="px-4 py-3 rounded bg-zinc-900/50 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Output</p>
          <p className="text-sm text-zinc-300 mono">C / CFG / XREF</p>
        </div>
        <div className="px-4 py-3 rounded bg-zinc-900/50 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Avg. Latency</p>
          <p className="text-sm text-zinc-300 mono">1.3s</p>
        </div>
      </div>
    </section>
  );
}

function LiveFeed() {
  const [events, setEvents] = useState<{ time: string; action: string; detail: string }[]>([]);

  useEffect(() => {
    const actions = [
      { action: "DECOMPILE", detail: "x86_64 ELF — 2,847 functions" },
      { action: "DECOMPILE", detail: "ARM32 firmware — 341 functions" },
      { action: "ANALYZE", detail: "PE amd64 — symbol resolution" },
      { action: "DECOMPILE", detail: "MIPS32 router binary — 1,203 functions" },
      { action: "XREF", detail: "Cross-reference scan — 14,891 refs mapped" },
      { action: "DECOMPILE", detail: "RISC-V ELF — 892 functions" },
      { action: "CFG", detail: "Control flow graph — 3,201 nodes" },
      { action: "ANALYZE", detail: "Mach-O arm64 — dynamic linking" },
      { action: "DECOMPILE", detail: "x86 PE — 5,443 functions" },
      { action: "PATCH", detail: "Binary patch applied — 3 relocations" },
    ];

    const addEvent = () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour12: false });
      const item = actions[Math.floor(Math.random() * actions.length)];
      setEvents((prev) => [{ time, ...item }, ...prev].slice(0, 8));
    };

    addEvent();
    const interval = setInterval(addEvent, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Service Telemetry</p>
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-zinc-400">Live Analysis Queue</span>
          </div>
          <span className="text-xs text-zinc-600 mono">cluster-us-east-1</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {events.map((ev, i) => (
            <div
              key={`${ev.time}-${i}`}
              className="flex items-center gap-4 px-4 py-2.5 text-xs animate-slide-down"
            >
              <span className="text-zinc-600 mono w-20 shrink-0">{ev.time}</span>
              <span className={`mono w-24 shrink-0 ${
                ev.action === "DECOMPILE" ? "text-amber-400/70" :
                ev.action === "ANALYZE" ? "text-blue-400/70" :
                ev.action === "XREF" ? "text-emerald-400/70" :
                ev.action === "CFG" ? "text-purple-400/70" :
                "text-zinc-400"
              }`}>{ev.action}</span>
              <span className="text-zinc-400 truncate">{ev.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsGrid() {
  return (
    <section className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <AnimatedStat key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} format={stat.format} />
        ))}
      </div>
    </section>
  );
}

function AccessTiers() {
  return (
    <section id="access" className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Token Utility</p>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Wallet Balance = API Key</h2>
        <p className="text-sm text-zinc-400 max-w-xl">
          Hold $GHIDRA to unlock decompilation tiers. No accounts, no subscriptions.
          Your wallet balance is checked on-chain per request. Higher balance = more
          capacity, more architectures, priority queue access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACCESS_TIERS.map((tier) => (
          <div
            key={tier.tier}
            className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.color }}></div>
              <p className="text-sm font-medium text-zinc-200">{tier.tier}</p>
            </div>
            <p className="text-2xl font-semibold text-zinc-100 mono mb-1">
              {tier.tokens === "0" ? "Free" : tier.tokens}
            </p>
            {tier.tokens !== "0" && <p className="text-xs text-zinc-500 mb-3">$GHIDRA held</p>}
            {tier.tokens === "0" && <p className="text-xs text-zinc-500 mb-3">No tokens required</p>}
            <div className="pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-400 mb-1">
                <span className="text-zinc-500">Calls:</span> {tier.calls}
              </p>
              <p className="text-xs text-zinc-400">
                <span className="text-zinc-500">Access:</span> {tier.features}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-200 mb-1">Vulnerability Bounties</p>
            <p className="text-xs text-zinc-400">
              Discover vulnerabilities through the service. Submit verified findings for $GHIDRA bounties from the protocol treasury.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">Critical</p>
              <p className="text-sm text-zinc-200 mono">50K</p>
            </div>
            <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">High</p>
              <p className="text-sm text-zinc-200 mono">20K</p>
            </div>
            <div className="px-3 py-2 rounded bg-zinc-800/50 border border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">Medium</p>
              <p className="text-sm text-zinc-200 mono">5K</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">FAQ</p>
      <h2 className="text-xl font-semibold text-zinc-100 mb-8">Common Questions</h2>

      <div className="space-y-2 max-w-3xl">
        {FAQS.map((faq, i) => (
          <div key={i} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-900/50 transition-colors cursor-pointer"
            >
              <span className="text-sm text-zinc-200">{faq.q}</span>
              <span className="text-zinc-500 text-xs mono ml-4">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 animate-slide-down">
                <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-5 md:px-10 py-10 border-t border-zinc-800 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <p className="text-sm text-zinc-300 font-medium mb-2">$GHIDRA</p>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
            The agency built the tool. We built the service.
            Hosted binary analysis powered by Ghidra&apos;s open-source engine.
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Resources</p>
            <div className="flex flex-col gap-1.5">
              <Link href="/docs" className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">Documentation</Link>
              <a href="https://github.com/NationalSecurityAgency/ghidra" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">Ghidra GitHub</a>
              <a href="https://ghidra-sre.org" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">ghidra-sre.org</a>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Protocol</p>
            <div className="flex flex-col gap-1.5">
              <a href="https://pump.fun" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">pump.fun</a>
              <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">DexScreener</a>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-4 border-t border-zinc-800/50">
        <p className="text-xs text-zinc-600">
          Ghidra is a trademark of the National Security Agency. This project is not affiliated with or endorsed by NSA.
          Built on open-source software released under the Apache 2.0 License.
        </p>
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 relative">
      <HexRain />
      <div className="relative z-10">
      <TopBar />

      {/* Hero */}
      <section className="px-5 md:px-10 pt-16 pb-10 max-w-6xl mx-auto">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Hosted Binary Analysis</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4 tracking-tight leading-tight max-w-2xl">
          The agency built the tool.<br />
          We built the service.
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mb-8">
          Submit any binary. Get decompiled C source, control flow graphs, and
          cross-references in seconds. Powered by Ghidra&apos;s decompilation engine,
          running on dedicated infrastructure. Token holders get priority access.
        </p>
        <div className="flex items-center gap-3">
          <a href="#demo" className="px-5 py-2.5 text-sm rounded bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors">
            Try Demo
          </a>
          <Link href="/docs" className="px-5 py-2.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-900 transition-colors">
            Read Docs
          </Link>
        </div>
      </section>

      <OriginSection />
      <DecompilationDemo />
      {/* CFG Visualization */}
      <section className="px-5 md:px-10 py-14 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Analysis Output</p>
            <h2 className="text-xl font-semibold text-zinc-100">Control Flow Graph</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CFGVisualization />
          <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Function Metadata</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Name</span><span className="text-zinc-300 mono">compute_sum</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Basic Blocks</span><span className="text-zinc-300 mono">5</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Edges</span><span className="text-zinc-300 mono">5 (1 back-edge)</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Cyclomatic Complexity</span><span className="text-zinc-300 mono">2</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Stack Frame</span><span className="text-zinc-300 mono">0x18 bytes</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Calling Convention</span><span className="text-zinc-300 mono">cdecl</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Cross-References</span><span className="text-zinc-300 mono">3 (main, test_sum, bench)</span></div>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">Decompiler Confidence</p>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: "94%" }}></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">94% — High confidence recovery</p>
            </div>
          </div>
        </div>
      </section>

      <LiveFeed />
      <StatsGrid />
      <AccessTiers />
      <FAQ />
      <Footer />
      </div>
    </div>
  );
}
