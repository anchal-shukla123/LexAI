"use client";

import { type ElementType, type ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Check,
  CreditCard,
  Database,
  Download,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const profileDefaults = {
  fullName: "Anchal Shukla",
  email: "anchal@example.com",
  role: "Founder / Developer",
  company: "Apex Workspace"
};

const workspaceDefaults = {
  name: "Apex Workspace",
  documentType: "Commercial / Privacy",
  exportFormat: "PDF",
  region: "India"
};

const aiDefaults = {
  analysisDepth: "Balanced",
  tone: "Legal Professional",
  includeRecommendations: true,
  showConfidence: true,
  highlightRiskyClauses: true
};

const notificationDefaults = {
  reportReady: true,
  highRiskAlerts: true,
  weeklySummary: false,
  exportActivity: true
};

type Tone = "success" | "warning" | "error" | "neutral" | "purple" | "primary";

function SettingCard({
  title,
  icon: Icon,
  children,
  description,
  accent = "primary"
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  description?: string;
  accent?: "primary" | "purple" | "success" | "warning";
}) {
  const accentClass = {
    primary: "border-[#3B82F6]/35 bg-[#3B82F6]/10 text-[#BFDBFE]",
    purple: "border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    success: "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]",
    warning: "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FCD34D]"
  }[accent];

  return (
    <Card className="border-border/90 bg-[#161B22]/95 shadow-[0_16px_48px_rgba(0,0,0,0.22)] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
      <CardHeader className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", accentClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-xl leading-tight">{title}</CardTitle>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

function SettingsInput({
  id,
  label,
  value,
  onChange,
  type = "text"
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-xl border-[#334155] bg-[#0D1117]/90 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#3B82F6]/45 focus-visible:border-[#3B82F6] focus-visible:ring-[#3B82F6] focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
      />
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const tones = {
    success: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]",
    warning: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    error: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]",
    neutral: "border-border bg-[#1F2937] text-muted-foreground",
    purple: "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    primary: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#BFDBFE]"
  };

  return <span className={cn("inline-flex min-h-7 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

function InlineNote({ message, tone = "success" }: { message: string; tone?: Tone }) {
  const colors = {
    success: "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#86EFAC]",
    warning: "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FCD34D]",
    error: "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#FCA5A5]",
    neutral: "border-border bg-[#1F2937] text-muted-foreground",
    purple: "border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    primary: "border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#BFDBFE]"
  };

  return (
    <p className={cn("rounded-xl border px-4 py-3 text-sm leading-6 motion-safe:animate-[lexai-section-in_260ms_ease-out]", colors[tone])} role="status">
      {message}
    </p>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
  accent = "primary"
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  accent?: "primary" | "purple";
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid gap-2 rounded-2xl border border-border bg-[#0D1117]/75 p-1.5 sm:grid-cols-3" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={cn(
                "min-h-10 rounded-xl px-3 py-2 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? accent === "purple"
                    ? "bg-[#8B5CF6] text-white shadow-[0_10px_28px_rgba(139,92,246,0.28)]"
                    : "bg-[#3B82F6] text-white shadow-[0_10px_28px_rgba(59,130,246,0.26)]"
                  : "text-muted-foreground hover:bg-[#1F2937] hover:text-foreground"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  accent = "primary"
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: "primary" | "purple";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-[#0D1117]/70 p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-6 text-foreground">{label}</span>
        {description ? <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked
            ? accent === "purple"
              ? "border-[#8B5CF6] bg-[#8B5CF6]"
              : "border-[#3B82F6] bg-[#3B82F6]"
            : "border-[#334155] bg-[#1F2937]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition duration-200 ease-out",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function ChoicePills({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-10 rounded-xl border px-4 py-2 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === option
                ? "border-[#3B82F6]/70 bg-[#3B82F6]/15 text-[#BFDBFE]"
                : "border-border bg-[#0D1117]/70 text-muted-foreground hover:border-[#3B82F6]/45 hover:text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmationModal({
  open,
  onClose,
  onConfirm
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0D1117]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-workspace-title">
      <div className="w-full max-w-md rounded-2xl border border-[#EF4444]/35 bg-[#161B22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] motion-safe:animate-[lexai-section-in_220ms_ease-out]">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <button
            type="button"
            aria-label="Close delete workspace dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-[#1F2937] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <h2 id="delete-workspace-title" className="mt-5 text-2xl font-bold leading-tight text-foreground">
          Delete workspace?
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">This is a mock action. No real workspace will be deleted.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="w-full bg-[#EF4444] shadow-[0_10px_28px_rgba(239,68,68,0.25)] hover:bg-[#DC2626] sm:w-auto"
          >
            Confirm mock delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
      <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(profileDefaults);
  const [workspace, setWorkspace] = useState(workspaceDefaults);
  const [aiPreferences, setAiPreferences] = useState(aiDefaults);
  const [notifications, setNotifications] = useState(notificationDefaults);
  const [profileNote, setProfileNote] = useState("");
  const [workspaceNote, setWorkspaceNote] = useState("");
  const [securityNote, setSecurityNote] = useState("");
  const [billingNote, setBillingNote] = useState("");
  const [dataNote, setDataNote] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Workspace settings
            </div>
            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Settings</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Manage your LexAI profile, workspace, AI preferences, and security controls.
            </p>
          </div>
          <p className="max-w-sm rounded-2xl border border-border bg-[#161B22]/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
            Frontend-only demo preferences for the LexAI MVP.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <SettingCard title="Profile" icon={UserRound} description="Your account identity across the LexAI workspace.">
              <div className="grid gap-4 md:grid-cols-2">
                <SettingsInput id="full-name" label="Full name" value={profile.fullName} onChange={(fullName) => setProfile((current) => ({ ...current, fullName }))} />
                <SettingsInput id="email" label="Email" value={profile.email} type="email" onChange={(email) => setProfile((current) => ({ ...current, email }))} />
                <SettingsInput id="role" label="Role" value={profile.role} onChange={(role) => setProfile((current) => ({ ...current, role }))} />
                <SettingsInput id="company" label="Company" value={profile.company} onChange={(company) => setProfile((current) => ({ ...current, company }))} />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => setProfileNote("Profile changes saved locally.")} className="w-full sm:w-auto">
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProfile(profileDefaults);
                    setProfileNote("Profile fields reset to the default mock profile.");
                  }}
                  className="w-full sm:w-auto"
                >
                  Reset
                </Button>
              </div>
              {profileNote ? <div className="mt-4"><InlineNote message={profileNote} /></div> : null}
            </SettingCard>

            <SettingCard title="Workspace" icon={BriefcaseBusiness} description="Default workspace context for analysis, exports, and regional settings.">
              <div className="grid gap-5">
                <SettingsInput id="workspace-name" label="Workspace name" value={workspace.name} onChange={(name) => setWorkspace((current) => ({ ...current, name }))} />
                <ChoicePills label="Default document type" options={["Commercial / Privacy", "Financing", "Employment"]} value={workspace.documentType} onChange={(documentType) => setWorkspace((current) => ({ ...current, documentType }))} />
                <ChoicePills label="Default export format" options={["PDF", "DOCX", "Secure link"]} value={workspace.exportFormat} onChange={(exportFormat) => setWorkspace((current) => ({ ...current, exportFormat }))} />
                <ChoicePills label="Region" options={["India", "United States", "United Kingdom"]} value={workspace.region} onChange={(region) => setWorkspace((current) => ({ ...current, region }))} />
              </div>
              <div className="mt-5">
                <Button type="button" onClick={() => setWorkspaceNote("Workspace settings updated locally.")} className="w-full sm:w-auto">
                  Save changes
                </Button>
              </div>
              {workspaceNote ? <div className="mt-4"><InlineNote message={workspaceNote} /></div> : null}
            </SettingCard>

            <SettingCard title="AI Preferences" icon={Sparkles} description="Tune how LexAI explains risk, recommendations, and analysis depth." accent="purple">
              <div className="space-y-5">
                <SegmentedControl
                  label="Analysis depth"
                  options={["Quick", "Balanced", "Detailed"]}
                  value={aiPreferences.analysisDepth}
                  accent="purple"
                  onChange={(analysisDepth) => setAiPreferences((current) => ({ ...current, analysisDepth }))}
                />
                <SegmentedControl
                  label="AI tone"
                  options={["Plain English", "Legal Professional", "Founder Friendly"]}
                  value={aiPreferences.tone}
                  accent="purple"
                  onChange={(tone) => setAiPreferences((current) => ({ ...current, tone }))}
                />
                <div className="grid gap-3">
                  <ToggleSwitch label="Include recommendations" checked={aiPreferences.includeRecommendations} accent="purple" onChange={(includeRecommendations) => setAiPreferences((current) => ({ ...current, includeRecommendations }))} />
                  <ToggleSwitch label="Show confidence scores" checked={aiPreferences.showConfidence} accent="purple" onChange={(showConfidence) => setAiPreferences((current) => ({ ...current, showConfidence }))} />
                  <ToggleSwitch label="Highlight risky clauses" checked={aiPreferences.highlightRiskyClauses} accent="purple" onChange={(highlightRiskyClauses) => setAiPreferences((current) => ({ ...current, highlightRiskyClauses }))} />
                </div>
              </div>
            </SettingCard>

            <SettingCard title="Notifications" icon={Bell} description="Choose which workspace events should surface as product alerts.">
              <div className="grid gap-3">
                <ToggleSwitch label="Report ready notifications" checked={notifications.reportReady} onChange={(reportReady) => setNotifications((current) => ({ ...current, reportReady }))} />
                <ToggleSwitch label="High-risk clause alerts" checked={notifications.highRiskAlerts} onChange={(highRiskAlerts) => setNotifications((current) => ({ ...current, highRiskAlerts }))} />
                <ToggleSwitch label="Weekly workspace summary" checked={notifications.weeklySummary} onChange={(weeklySummary) => setNotifications((current) => ({ ...current, weeklySummary }))} />
                <ToggleSwitch label="Export/share activity" checked={notifications.exportActivity} onChange={(exportActivity) => setNotifications((current) => ({ ...current, exportActivity }))} />
              </div>
            </SettingCard>

            <SettingCard title="Security" icon={LockKeyhole} description="Mock controls for account protection and session visibility." accent="success">
              <div className="grid gap-3">
                {[
                  ["Password", "Last changed 14 days ago", "success"],
                  ["Two-factor authentication", "Not enabled", "warning"],
                  ["Active sessions", "2 devices", "primary"],
                  ["Login alerts", "Enabled", "success"]
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex flex-col gap-3 rounded-2xl border border-border bg-[#0D1117]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block text-sm font-medium leading-6 text-foreground">{label}</span>
                      <span className="block text-sm leading-6 text-muted-foreground">{value}</span>
                    </span>
                    <StatusBadge tone={tone as Tone}>{value}</StatusBadge>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {["Change password", "Enable 2FA", "View sessions"].map((action) => (
                  <Button key={action} type="button" variant="outline" onClick={() => setSecurityNote("This security flow will be available in the production build.")} className="w-full sm:w-auto">
                    {action}
                  </Button>
                ))}
              </div>
              {securityNote ? <div className="mt-4"><InlineNote message={securityNote} tone="warning" /></div> : null}
            </SettingCard>

            <SettingCard title="Data & Privacy" icon={Database} description="Demo-only data controls and privacy posture for the MVP." accent="warning">
              <div className="grid gap-3">
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-[#0D1117]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">Uploaded files</span>
                  <StatusBadge tone="neutral">Local frontend demo only</StatusBadge>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-[#0D1117]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">AI training</span>
                  <StatusBadge tone="success">Disabled</StatusBadge>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-[#0D1117]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">Data retention</span>
                  <StatusBadge tone="warning">30 days mock policy</StatusBadge>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDataNote("Mock workspace export prepared.")} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(true)} className="w-full border-[#EF4444]/45 text-[#FCA5A5] hover:border-[#EF4444] hover:bg-[#EF4444]/10 sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete workspace
                </Button>
              </div>
              {dataNote ? <div className="mt-4"><InlineNote message={dataNote} tone={dataNote.includes("delete") ? "warning" : "primary"} /></div> : null}
            </SettingCard>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Account summary">
            <SummaryCard title="Account Summary">
              <dl className="space-y-3">
                {[
                  ["Name", profile.fullName],
                  ["Workspace", workspace.name],
                  ["Plan", "LexAI Pro Mock"],
                  ["Role", "Owner"]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </SummaryCard>

            <SummaryCard title="Plan">
              <div className="rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-4">
                <p className="text-lg font-semibold leading-tight text-foreground">LexAI Pro</p>
                <p className="mt-2 text-sm leading-6 text-[#C4B5FD]">1,240 AI credits left</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0D1117]">
                  <span className="block h-full w-[68%] rounded-full bg-[#8B5CF6]" />
                </div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">68% usage</p>
              </div>
              <Button type="button" onClick={() => setBillingNote("Billing will be available in the production build.")} className="mt-4 w-full">
                <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                Upgrade plan
              </Button>
              {billingNote ? <div className="mt-4"><InlineNote message={billingNote} tone="purple" /></div> : null}
            </SummaryCard>

            <SummaryCard title="Security Status">
              <div className="space-y-3">
                <StatusBadge tone="success"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Account protected</StatusBadge>
                <StatusBadge tone="success"><Bell className="h-3.5 w-3.5" aria-hidden="true" /> Login alerts on</StatusBadge>
                <StatusBadge tone="warning"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> 2FA recommended</StatusBadge>
              </div>
            </SummaryCard>

            <SummaryCard title="Privacy Note">
              <p className="text-sm leading-6 text-muted-foreground">
                LexAI keeps this demo local. No files are uploaded, stored, or used to train models.
              </p>
            </SummaryCard>
          </aside>
        </div>
      </div>

      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          setDeleteModalOpen(false);
          setDataNote("Mock delete confirmed.");
        }}
      />
    </DashboardShell>
  );
}
