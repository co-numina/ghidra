"use client";

import { useState } from "react";
import Link from "next/link";

const CA = "PASTE_CA_HERE";

const SECTIONS = [
  "Overview",
  "Architecture",
  "API Reference",
  "Authentication",
  "Rate Limits",
  "Output Formats",
  "Scripting",
  "Changelog",
];

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors text-sm mono cursor-pointer"
    >
      {label && <span className="text-zinc-400 text-xs hidden sm:inline">{label}</span>}
      <span className="text-zinc-300 text-xs">{text.length > 20 ? text.slice(0, 6) + "..." + text.slice(-4) : text}</span>
      <span className="text-zinc-500 text-xs">{copied ? "copied" : "copy"}</span>
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-500 mono">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="text-xs text-zinc-500 hover:text-zinc-400 cursor-pointer"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="p-4 text-xs mono text-zinc-300 overflow-x-auto leading-relaxed bg-zinc-950">
        {code}
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("Overview");

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <span className="mono text-sm font-bold text-zinc-300">G</span>
            </div>
            <span className="font-semibold text-zinc-200 text-sm tracking-tight">$GHIDRA</span>
          </Link>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-zinc-400 text-xs">Documentation</span>
        </div>
        <CopyButton text={CA} label="CA" />
      </header>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar */}
        <nav className="hidden md:block w-56 shrink-0 border-r border-zinc-800 p-5 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`block w-full text-left px-3 py-2 rounded text-xs transition-colors cursor-pointer ${
                  activeSection === s
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800">
            <a
              href="https://github.com/NationalSecurityAgency/ghidra"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Ghidra GitHub →
            </a>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 px-5 md:px-10 py-10 max-w-3xl">
          {/* Overview */}
          <section className={activeSection === "Overview" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Overview</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              $GHIDRA provides token-gated access to a hosted decompilation service powered by
              NSA&apos;s Ghidra reverse engineering framework. Submit compiled binaries via REST API
              and receive decompiled C source code, control flow graphs, cross-references, and
              symbol tables.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="p-4 rounded bg-zinc-900/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">What you submit</p>
                <p className="text-sm text-zinc-300">Compiled binaries (ELF, PE, Mach-O, raw)</p>
              </div>
              <div className="p-4 rounded bg-zinc-900/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">What you get back</p>
                <p className="text-sm text-zinc-300">Decompiled C, CFG, XREF, symbols</p>
              </div>
              <div className="p-4 rounded bg-zinc-900/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">What it costs</p>
                <p className="text-sm text-zinc-300">$GHIDRA token balance = access tier</p>
              </div>
            </div>

            <h3 className="text-sm font-medium text-zinc-200 mb-3">Quick Start</h3>
            <CodeBlock lang="bash" code={`# Submit a binary for decompilation
curl -X POST https://api.ghidra.services/v1/decompile \\
  -H "X-Wallet: YOUR_SOLANA_ADDRESS" \\
  -F "binary=@./target.elf" \\
  -F "arch=x86_64" \\
  -F "output=c,cfg"

# Response
{
  "job_id": "gh_7f3a9b2e",
  "status": "processing",
  "eta_ms": 1300
}`} />
            <CodeBlock lang="bash" code={`# Poll for results
curl https://api.ghidra.services/v1/jobs/gh_7f3a9b2e \\
  -H "X-Wallet: YOUR_SOLANA_ADDRESS"

# Response
{
  "status": "complete",
  "functions": 2847,
  "decompiled_c": "https://api.ghidra.services/v1/jobs/gh_7f3a9b2e/output.c",
  "cfg_svg": "https://api.ghidra.services/v1/jobs/gh_7f3a9b2e/cfg.svg",
  "xrefs": "https://api.ghidra.services/v1/jobs/gh_7f3a9b2e/xrefs.json"
}`} />
          </section>

          {/* Architecture */}
          <section className={activeSection === "Architecture" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Architecture</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              The service runs Ghidra in headless mode across a distributed cluster. Each
              decompilation job is isolated in its own container with resource limits based
              on the submitter&apos;s access tier.
            </p>

            <h3 className="text-sm font-medium text-zinc-200 mb-3">System Components</h3>
            <div className="space-y-3 mb-8">
              {[
                { name: "API Gateway", desc: "Rate limiting, wallet verification, job routing. Checks on-chain token balance per request via Helius RPC." },
                { name: "Job Queue", desc: "Redis-backed priority queue. Core tier gets dedicated lanes. Public tier shares a common pool with 5 req/day cap." },
                { name: "Analysis Workers", desc: "Containerized Ghidra headless instances (11.3). Each worker handles one binary at a time. Auto-scales 2-50 instances." },
                { name: "Storage Layer", desc: "S3-compatible object store. Results retained for 24h (Public), 7d (Analyst), 30d (Operator), persistent (Core)." },
                { name: "Solana Verifier", desc: "On-chain balance check at request time. No staking required — just hold $GHIDRA in your wallet. Checked via getParsedTokenAccountsByOwner." },
              ].map((c) => (
                <div key={c.name} className="p-4 rounded bg-zinc-900/50 border border-zinc-800">
                  <p className="text-sm font-medium text-zinc-200 mb-1 mono">{c.name}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-medium text-zinc-200 mb-3">Request Flow</h3>
            <CodeBlock lang="text" code={`Client → API Gateway → Wallet Verify (Solana RPC)
                          ↓
                    Token Balance Check
                          ↓
              Tier Assignment (Public/Analyst/Operator/Core)
                          ↓
                    Job Queue (priority by tier)
                          ↓
              Analysis Worker (Ghidra Headless 11.3)
                          ↓
                Binary Load → Auto-Analysis → Decompilation
                          ↓
              Output Generation (C / CFG / XREF / Symbols)
                          ↓
                    Storage Layer (S3)
                          ↓
              Client polls → Downloads results`} />
          </section>

          {/* API Reference */}
          <section className={activeSection === "API Reference" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">API Reference</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Base URL: <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">https://api.ghidra.services/v1</code>
            </p>

            {[
              {
                method: "POST",
                path: "/decompile",
                desc: "Submit a binary for decompilation",
                params: [
                  { name: "binary", type: "file", required: true, desc: "The binary file to analyze" },
                  { name: "arch", type: "string", required: false, desc: "Target architecture (auto-detected if omitted). Options: x86, x86_64, arm, arm64, mips, mips64, ppc, riscv" },
                  { name: "output", type: "string", required: false, desc: "Comma-separated output types: c, cfg, xref, symbols. Default: c" },
                  { name: "base_addr", type: "string", required: false, desc: "Base address override for raw binaries (hex)" },
                ],
              },
              {
                method: "GET",
                path: "/jobs/:job_id",
                desc: "Check job status and retrieve results",
                params: [
                  { name: "job_id", type: "path", required: true, desc: "Job ID returned from /decompile" },
                ],
              },
              {
                method: "GET",
                path: "/jobs/:job_id/functions",
                desc: "List all recovered functions with addresses and signatures",
                params: [
                  { name: "offset", type: "query", required: false, desc: "Pagination offset (default: 0)" },
                  { name: "limit", type: "query", required: false, desc: "Results per page (default: 100, max: 1000)" },
                ],
              },
              {
                method: "POST",
                path: "/batch",
                desc: "Submit multiple binaries in one request (Analyst+ tier)",
                params: [
                  { name: "binaries", type: "file[]", required: true, desc: "Array of binary files" },
                  { name: "arch", type: "string", required: false, desc: "Shared architecture hint" },
                ],
              },
              {
                method: "GET",
                path: "/usage",
                desc: "Check your current usage and remaining quota",
                params: [],
              },
            ].map((endpoint) => (
              <div key={endpoint.path} className="mb-8 p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs mono font-medium ${
                    endpoint.method === "POST" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>{endpoint.method}</span>
                  <code className="text-sm text-zinc-200">{endpoint.path}</code>
                </div>
                <p className="text-xs text-zinc-400 mb-4">{endpoint.desc}</p>
                {endpoint.params.length > 0 && (
                  <div className="space-y-2">
                    {endpoint.params.map((p) => (
                      <div key={p.name} className="flex items-start gap-3 text-xs">
                        <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                        <span className="text-zinc-600 mono shrink-0">{p.type}</span>
                        {p.required && <span className="text-amber-400/70 shrink-0">required</span>}
                        <span className="text-zinc-500">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <h3 className="text-sm font-medium text-zinc-200 mb-3">Headers</h3>
            <CodeBlock lang="text" code={`X-Wallet: <solana_address>    # Required. Your Solana wallet address.
                                # Token balance checked on-chain per request.
Content-Type: multipart/form-data  # For binary uploads
Accept: application/json           # Response format`} />
          </section>

          {/* Authentication */}
          <section className={activeSection === "Authentication" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Authentication</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              No API keys. No accounts. No sign-ups. Authentication is your Solana wallet address.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Every request includes your wallet address in the <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">X-Wallet</code> header.
              The API gateway checks your $GHIDRA token balance on-chain via Helius RPC and assigns
              your access tier for that request. Balance changes take effect immediately.
            </p>
            <CodeBlock lang="bash" code={`# That's it. Your wallet is your API key.
curl -X POST https://api.ghidra.services/v1/decompile \\
  -H "X-Wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \\
  -F "binary=@./malware.elf"

# The gateway checks:
# 1. Does this wallet hold $GHIDRA tokens?
# 2. How many? → Determines tier
# 3. Is this tier within rate limits? → Allow/deny`} />
          </section>

          {/* Rate Limits */}
          <section className={activeSection === "Rate Limits" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Rate Limits</h1>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="py-3 pr-4 text-xs text-zinc-500 font-normal">Tier</th>
                    <th className="py-3 pr-4 text-xs text-zinc-500 font-normal">Tokens Held</th>
                    <th className="py-3 pr-4 text-xs text-zinc-500 font-normal">Requests/Day</th>
                    <th className="py-3 pr-4 text-xs text-zinc-500 font-normal">Max Binary Size</th>
                    <th className="py-3 text-xs text-zinc-500 font-normal">Concurrent Jobs</th>
                  </tr>
                </thead>
                <tbody className="text-xs mono">
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-zinc-300">Public</td>
                    <td className="py-3 pr-4 text-zinc-400">0</td>
                    <td className="py-3 pr-4 text-zinc-400">5</td>
                    <td className="py-3 pr-4 text-zinc-400">1 MB</td>
                    <td className="py-3 text-zinc-400">1</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-zinc-300">Analyst</td>
                    <td className="py-3 pr-4 text-zinc-400">10,000</td>
                    <td className="py-3 pr-4 text-zinc-400">200</td>
                    <td className="py-3 pr-4 text-zinc-400">10 MB</td>
                    <td className="py-3 text-zinc-400">5</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-zinc-300">Operator</td>
                    <td className="py-3 pr-4 text-zinc-400">100,000</td>
                    <td className="py-3 pr-4 text-zinc-400">2,000</td>
                    <td className="py-3 pr-4 text-zinc-400">50 MB</td>
                    <td className="py-3 text-zinc-400">20</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-zinc-300">Core</td>
                    <td className="py-3 pr-4 text-zinc-400">500,000</td>
                    <td className="py-3 pr-4 text-zinc-400">Unlimited</td>
                    <td className="py-3 pr-4 text-zinc-400">No limit</td>
                    <td className="py-3 text-zinc-400">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Output Formats */}
          <section className={activeSection === "Output Formats" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Output Formats</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Specify output types via the <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">output</code> parameter.
              Multiple formats can be requested per job.
            </p>
            <div className="space-y-3">
              {[
                { format: "c", name: "Decompiled C", desc: "Human-readable C source with recovered variable names, types, and control structures." },
                { format: "cfg", name: "Control Flow Graph", desc: "SVG visualization of function control flow. Nodes are basic blocks, edges show branches." },
                { format: "xref", name: "Cross-References", desc: "JSON mapping of function calls, data references, and string references across the binary." },
                { format: "symbols", name: "Symbol Table", desc: "All recovered symbols: functions, globals, imports, exports with addresses and types." },
                { format: "disasm", name: "Disassembly", desc: "Full disassembly listing with addresses, bytes, and instructions. Available for Operator+ tiers." },
              ].map((f) => (
                <div key={f.format} className="p-4 rounded bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-amber-400/70 bg-zinc-800 px-1.5 py-0.5 rounded">{f.format}</code>
                    <span className="text-sm text-zinc-200">{f.name}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scripting */}
          <section className={activeSection === "Scripting" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Scripting</h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Operator and Core tiers can submit Ghidra scripts (Java or Python) to run
              custom analysis passes on their binaries. Scripts execute in sandboxed
              environments with access to the full Ghidra API.
            </p>
            <CodeBlock lang="bash" code={`# Submit a binary with a custom analysis script
curl -X POST https://api.ghidra.services/v1/decompile \\
  -H "X-Wallet: YOUR_SOLANA_ADDRESS" \\
  -F "binary=@./target.elf" \\
  -F "script=@./FindCryptoConstants.java" \\
  -F "output=c,script_output"

# Script output is returned alongside standard decompilation
{
  "job_id": "gh_a1b2c3d4",
  "outputs": {
    "c": "https://api.ghidra.services/v1/jobs/gh_a1b2c3d4/output.c",
    "script_output": "https://api.ghidra.services/v1/jobs/gh_a1b2c3d4/script.json"
  }
}`} />

            <h3 className="text-sm font-medium text-zinc-200 mb-3 mt-8">Example: Find Crypto Constants</h3>
            <CodeBlock lang="java" code={`// FindCryptoConstants.java — Ghidra Script
// Scans binary for known cryptographic constants (AES S-box, SHA round constants)

import ghidra.app.script.GhidraScript;
import ghidra.program.model.mem.MemoryBlock;

public class FindCryptoConstants extends GhidraScript {
    
    private static final byte[] AES_SBOX_PREFIX = {
        0x63, 0x7c, 0x77, 0x7b, (byte)0xf2, 0x6b, 0x6f, (byte)0xc5
    };
    
    @Override
    public void run() throws Exception {
        for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
            if (!block.isInitialized()) continue;
            // Search for AES S-box
            var addr = find(block.getStart(), AES_SBOX_PREFIX);
            if (addr != null) {
                println("AES S-box found at: " + addr);
                createLabel(addr, "AES_SBOX", true);
            }
        }
    }
}`} />
          </section>

          {/* Changelog */}
          <section className={activeSection === "Changelog" ? "" : "hidden"}>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Changelog</h1>
            <div className="space-y-6">
              {[
                { version: "1.0.0", date: "Feb 2026", changes: ["Initial launch — Ghidra 11.3 decompilation engine", "REST API with wallet-based authentication", "Support for x86, x86_64, ARM, ARM64, MIPS architectures", "Output formats: C, CFG, XREF, Symbols", "Four access tiers: Public, Analyst, Operator, Core"] },
                { version: "1.1.0", date: "Mar 2026", changes: ["Batch API for multi-binary submissions (Analyst+)", "Custom Ghidra script execution (Operator+)", "RISC-V and PowerPC architecture support", "Persistent analysis databases for Core tier", "Vulnerability bounty program launch"] },
                { version: "1.2.0", date: "Apr 2026", changes: ["Disassembly output format", "Function similarity search across analysis history", "Webhook notifications for job completion", "Improved type recovery for C++ binaries"] },
              ].map((release) => (
                <div key={release.version} className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-zinc-200 mono">v{release.version}</span>
                    <span className="text-xs text-zinc-500">{release.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {release.changes.map((c, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                        <span className="text-zinc-600 mt-0.5">—</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
