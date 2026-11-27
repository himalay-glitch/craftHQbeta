import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Toast, type ToastMessage } from "@/components/dashboard/Toast";
import type { ProjectSettings, ProjectTab, SettingsTab, YourTab } from "@/types/settings";
import { ClaudeSection } from "./ClaudeSettings";
import { GitHubSection } from "./GitHubSettings";
import { GeneralSection, GitHubAccessSection, PeopleSection, ProjectTrackerSection } from "./ProjectSections";
import { RepositoriesSection } from "./RepositoriesSettings";
import { DEFAULTS, useSettings } from "./store";
import { SelectField, type Notify } from "./ui";
import { ProfileSection, TokensSection, TrackerSection } from "./YourSettings";

// Settings, as the live CraftHQ has it (Shubham, 26 Nov): "Your settings", the same in every project, and "Project
// settings", which change only the project named beside them. A 200 px menu on the left and forms of max-w-2xl
// (DESIGN.md §4.6). The section and the project are in the URL (?tab=repositories&project=wepop), so a reload, a shared
// link and Back all land on the same place; the Docs link /settings?tab=tokens. Below 1024 px the menu is one select.

const YOUR_TABS: { id: YourTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "github", label: "GitHub" },
  { id: "tracker", label: "Issue tracker" },
  { id: "tokens", label: "CraftHQ tokens" },
];

const PROJECT_TABS: { id: ProjectTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "people", label: "People" },
  { id: "repositories", label: "Repositories" },
  { id: "github-access", label: "GitHub access" },
  { id: "claude", label: "Claude" },
  { id: "project-tracker", label: "Issue tracker" },
];

const isProjectTab = (t: SettingsTab): t is ProjectTab => PROJECT_TABS.some((p) => p.id === t);

/** Other names for a section: the docs' "Settings › Claude account", and the first version's tabs. */
const ALIASES: Record<string, SettingsTab> = {
  accounts: "github",
  connections: "github",
  notifications: "profile",
  preferences: "profile",
  "claude-account": "claude",
  members: "people",
  repository: "repositories",
  workflow: "general",
  "issue-tracker": "tracker",
};

/** The section a `?tab=` value names; Profile when it names none. */
export function resolveTab(raw: string | null | undefined): SettingsTab {
  if (!raw) return "profile";
  const all: string[] = [...YOUR_TABS, ...PROJECT_TABS].map((t) => t.id);
  if (all.includes(raw)) return raw as SettingsTab;
  return ALIASES[raw] ?? "profile";
}

export const DEFAULT_PROJECT = DEFAULTS.projects[0].id;

/** The browser tab's title: "Profile · Settings · CraftHQ", "Repositories · WePop settings · CraftHQ". */
export function titleFor(tab: SettingsTab, projectName: string) {
  const label = [...YOUR_TABS, ...PROJECT_TABS].find((t) => t.id === tab)?.label ?? "Settings";
  return `${label} · ${isProjectTab(tab) ? `${projectName} settings` : "Settings"} · CraftHQ`;
}

/** The same, for the server, which knows the sample's project names. */
export const serverTitle = (tab: SettingsTab, projectId: string) =>
  titleFor(tab, (DEFAULTS.projects.find((p) => p.id === projectId) ?? DEFAULTS.projects[0]).name);

function hrefFor(tab: SettingsTab, project: string) {
  if (isProjectTab(tab)) return `/settings?tab=${tab}&project=${encodeURIComponent(project)}`;
  return tab === "profile" ? "/settings" : `/settings?tab=${tab}`;
}

// DESIGN.md §4.3's item, text only as on the live settings: 32 px, rounded-lg, 14 px. Hover is bg-hover; the current
// one bg-pressed with foreground text.
function NavItem({ label, href, current, onGo }: { label: string; href: string; current: boolean; onGo: (e: MouseEvent) => void }) {
  return (
    <li>
      <a
        href={href}
        onClick={onGo}
        aria-current={current ? "page" : undefined}
        className={`flex h-8 items-center rounded-lg px-2 text-sm text-[var(--tx)] transition-colors duration-[120ms] ${
          current ? "bg-pressed font-medium" : "hover:bg-hover"
        }`}
      >
        <span className="truncate">{label}</span>
      </a>
    </li>
  );
}

/**
 * Which project the settings below change: its colour dot (DESIGN.md §3.1) and name, as the live heading's "· WePop".
 * On its own line, because "Project settings · WePop ▾" doesn't fit the 200 px menu; a select when you're in more
 * than one project.
 */
function ProjectName({ id, projects, project, onPick }: { id: string; projects: ProjectSettings[]; project: ProjectSettings; onPick: (id: string) => void }) {
  const dot = <span aria-hidden="true" style={{ background: project.colour }} className="size-2 flex-none rounded-full" />;
  if (projects.length < 2) {
    return (
      <p className="m-0 flex h-8 items-center gap-2 px-2 text-sm font-medium text-[var(--tx)]">
        {dot}
        <span className="truncate">{project.name}</span>
      </p>
    );
  }
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute top-1/2 left-3 z-10 flex -translate-y-1/2">{dot}</span>
      <label htmlFor={id} className="sr-only">
        Project
      </label>
      <SelectField id={id} value={project.id} onChange={onPick} className="[&_select]:pl-7 [&_select]:font-medium">
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectField>
    </span>
  );
}

export function SettingsScreen({ initialTab, initialProject }: { initialTab: SettingsTab; initialProject: string }) {
  const { projects } = useSettings();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [projectId, setProjectId] = useState(initialProject);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  const notify: Notify = useCallback((message, action) => setToast({ key: Date.now(), message, action }), []);

  const go = useCallback((nextTab: SettingsTab, nextProject: string) => {
    setTab(nextTab);
    setProjectId(nextProject);
    window.history.pushState(null, "", hrefFor(nextTab, nextProject));
    // The new section's title takes the focus, so keyboard and screen-reader users start there.
    window.requestAnimationFrame(() => document.getElementById("settings-title")?.focus({ preventScroll: true }));
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }, []);

  // Back and Forward between sections.
  useEffect(() => {
    const onPop = () => {
      const q = new URLSearchParams(window.location.search);
      setTab(resolveTab(q.get("tab")));
      setProjectId(q.get("project") ?? DEFAULT_PROJECT);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // The browser tab names the section (and the project's name as it's saved now).
  useEffect(() => {
    document.title = titleFor(tab, project.name);
  }, [tab, project.name]);

  // Plain links in the HTML; a click without a modifier switches in place (a ⌘-click still opens a new tab).
  const onGo = (nextTab: SettingsTab) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    go(nextTab, project.id);
  };

  // Picking another project keeps the section, or opens its General when you were in your own settings.
  const pickProject = (id: string) => go(isProjectTab(tab) ? tab : "general", id);

  // A link to another section from inside one ("Project settings › GitHub access") switches in place too.
  const onSectionClick = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = (e.target as Element).closest("a");
    if (!a || a.target || a.origin !== window.location.origin || a.pathname !== "/settings") return;
    e.preventDefault();
    const q = new URLSearchParams(a.search);
    go(resolveTab(q.get("tab")), q.get("project") ?? project.id);
  };

  const props = { project, notify };
  const section = {
    profile: <ProfileSection notify={notify} />,
    github: <GitHubSection notify={notify} projectId={project.id} />,
    tracker: <TrackerSection />,
    tokens: <TokensSection notify={notify} />,
    general: <GeneralSection {...props} />,
    people: <PeopleSection {...props} />,
    repositories: <RepositoriesSection {...props} />,
    "github-access": <GitHubAccessSection {...props} />,
    claude: <ClaudeSection {...props} />,
    "project-tracker": <ProjectTrackerSection {...props} />,
  }[tab];

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
      {/* Phones and tablets: one select for the section, and the project's while one of its sections is open. */}
      <div className="flex flex-col gap-2 sm:flex-row lg:hidden">
        <label htmlFor="settings-section" className="sr-only">
          Section
        </label>
        <SelectField id="settings-section" value={tab} onChange={(v) => go(v as SettingsTab, project.id)} className="sm:max-w-xs sm:flex-1 [&_select]:font-medium">
          <optgroup label="Your settings">
            {YOUR_TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={`Project settings · ${project.name}`}>
            {PROJECT_TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
        </SelectField>
        {isProjectTab(tab) && projects.length > 1 && (
          <>
            <label htmlFor="settings-project-phone" className="sr-only">
              Project
            </label>
            <SelectField id="settings-project-phone" value={project.id} onChange={pickProject} className="sm:max-w-xs sm:flex-1">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </>
        )}
      </div>

      {/* From 1024 px: the menu, which stays in view while the form scrolls. */}
      <nav aria-label="Settings" className="hidden self-start lg:sticky lg:top-[calc(var(--bar-h)+24px)] lg:flex lg:flex-col lg:gap-8">
        <div>
          <p id="settings-nav-you" className="m-0 px-2 text-sm font-semibold text-[var(--tx)]">
            Your settings
          </p>
          <p className="m-0 px-2 text-xs text-[var(--tx2)]">The same in every project</p>
          <ul aria-labelledby="settings-nav-you" className="m-0 mt-2 flex list-none flex-col gap-0.5 p-0">
            {YOUR_TABS.map((t) => (
              <NavItem key={t.id} label={t.label} href={hrefFor(t.id, project.id)} current={tab === t.id} onGo={onGo(t.id)} />
            ))}
          </ul>
        </div>
        <div>
          <p className="m-0 px-2 text-sm font-semibold text-[var(--tx)]">Project settings</p>
          <p className="m-0 px-2 text-xs text-[var(--tx2)]">Changes only this project</p>
          <div className="mt-2">
            <ProjectName id="settings-project" projects={projects} project={project} onPick={pickProject} />
          </div>
          <ul aria-label={`Project settings for ${project.name}`} className="m-0 mt-2 flex list-none flex-col gap-0.5 p-0">
            {PROJECT_TABS.map((t) => (
              <NavItem key={t.id} label={t.label} href={hrefFor(t.id, project.id)} current={tab === t.id} onGo={onGo(t.id)} />
            ))}
          </ul>
        </div>
      </nav>

      <section aria-labelledby="settings-title" onClick={onSectionClick} className="min-w-0 max-w-2xl">
        {section}
      </section>

      <Toast toast={toast} onDismiss={() => setToast(null)} offsetRight="0px" />
    </div>
  );
}
