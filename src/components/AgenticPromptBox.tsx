"use client";

import { useState } from "react";
import { Bot, Check, Copy, Sparkles, Terminal } from "lucide-react";

interface AgenticPromptBoxProps {
  title?: string;
  action: string;
  prompt: string;
  contractAddress?: string;
  network?: string;
}

export function AgenticPromptBox({
  title = "Agentic Wallet Prompt",
  action,
  prompt,
  contractAddress = "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912",
  network = "BNB Smart Chain (56)",
}: AgenticPromptBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <section className="glass-panel p-5 rounded-2xl border border-sky-500/30 bg-slate-900/60 shadow-lg shadow-sky-950/20 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              {title}
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {action}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Run this prompt with your AI Agent or Agentic Wallet (Brian AI, AgentKit, GOAT)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          aria-label="Copy prompt for agentic wallet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Agent Prompt</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-3 relative">
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 font-mono text-xs text-sky-200/90 leading-relaxed select-all">
          <div className="flex items-start gap-2">
            <Terminal className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
            <span>&ldquo;{prompt}&rdquo;</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-300">Target:</span>
          <span className="text-slate-300 truncate max-w-[220px] sm:max-w-none">{contractAddress}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-300">Network:</span>
          <span className="text-emerald-400 font-medium">{network}</span>
        </div>
      </div>
    </section>
  );
}
