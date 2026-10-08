"use client";

import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { AGENTS, type AgentDef } from "@/components/ai-agents/agents";

export default function AIAgentsPage() {
  return (
    <div>
      <PageHeader title="AI Agents" subtitle="Single-purpose AI assistants and multi-step agentic workflows for credentialing automation" />

      <div className="card card-pad mb-4" style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}>
        <div className="flex items-start gap-3">
          <Icon name="AlertTriangle" size={18} style={{ color: "#a16207", marginTop: 2 }} />
          <div className="text-xs text-ink">
            <strong>AI agent execution is coming in a later phase.</strong> The agent catalog below shows the planned assistants and workflows. Each one will run against your real provider and
            enrollment data using an LLM API with proper system prompts, tools, and audit logging once the AI integration is enabled.
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Bot" size={16} className="text-accent" />
          <h2 className="font-display text-lg font-semibold text-ink">Single-Purpose Agents</h2>
          <Pill type="neutral">{AGENTS.filter((a) => a.type === "single").length}</Pill>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {AGENTS.filter((a) => a.type === "single").map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Sparkles" size={16} className="text-accent" />
          <h2 className="font-display text-lg font-semibold text-ink">Agentic Workflows</h2>
          <Pill type="accent">Multi-step</Pill>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AGENTS.filter((a) => a.type === "agentic").map((a) => (
            <AgentCard key={a.id} agent={a} agentic />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, agentic }: { agent: AgentDef; agentic?: boolean }) {
  return (
    <div className="card card-hover overflow-hidden">
      <div className="h-1" style={{ background: agent.color }}></div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: agent.color + "20", color: agent.color }}>
            <Icon name={agent.icon} size={18} />
          </div>
          {agentic && <Pill type="accent">{agent.steps} steps</Pill>}
        </div>
        <h3 className="font-display font-semibold text-ink mb-1">{agent.name}</h3>
        <p className="text-xs text-ink-light leading-relaxed mb-3">{agent.description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.skills.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-soft-2)", color: "var(--ink-light)" }}>
              {s}
            </span>
          ))}
        </div>
        <button className="btn btn-primary w-full" disabled title="AI agent execution is coming in a later phase">
          <Icon name="Clock" size={12} /> Coming soon
        </button>
      </div>
    </div>
  );
}
