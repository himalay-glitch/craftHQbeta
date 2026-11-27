import { useId, useState, type SubmitEvent } from "react";
import { Check, Mail, Plus } from "lucide-react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { TOOLS, useConnectedTools } from "@/components/stories/imports";
import type { GitHubLevel, ProjectMember, ProjectRole, ProjectSettings, ProjectTracker } from "@/types/settings";
import {
  BUILDING_AT_ONCE,
  FLOW_COLUMNS,
  GITHUB_LEVELS,
  LEVELS,
  ME,
  PLANNING_AT_ONCE,
  PROJECT_COLOURS,
  levelLabel,
  updateProject,
  useSettings,
} from "./store";
import {
  ConfirmDialog,
  FIELD,
  FIELD_READ,
  Field,
  Group,
  PageHeader,
  Pill,
  RADIO,
  ReadOnlyNote,
  Segmented,
  SelectField,
  formatDate,
  initialsOf,
  todayYmd,
  type Notify,
  type Scope,
} from "./ui";

// Project settings: they change only the project picked. The sections follow the live CraftHQ settings (General,
// Repositories, GitHub access, Claude, Issue tracker), plus People, which its docs list for admins
// (docs/CRAFTHQ_DOCS_SPEC.md §12). Members see every section read-only and are told which admin can change it.

// Exported for RepositoriesSettings.tsx, which has that section to itself.
export interface SectionProps {
  project: ProjectSettings;
  notify: Notify;
}

export const scopeOf = (p: ProjectSettings): Scope => ({ kind: "project", name: p.name, colour: p.colour });
/** For what's yours inside the project: your role, and your Claude account. */
export const youIn = (p: ProjectSettings): Scope => ({ kind: "you-in-project", name: p.name, colour: p.colour });
export const isAdmin = (p: ProjectSettings) => p.yourRole === "admin";
const adminNames = (p: ProjectSettings) => p.members.filter((m) => m.role === "admin" && m.id !== ME).map((m) => m.name);

const LINK = "font-medium text-primary-strong underline decoration-current/30 underline-offset-2 hover:decoration-current";
export const GHOST =
  "h-8 rounded-full px-3 text-sm font-medium whitespace-nowrap text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-hover hover:text-[var(--tx)]";

/** The live settings say plainly when a tab isn't yours to change, and who can. */
export function MemberNote({ project }: { project: ProjectSettings }) {
  return isAdmin(project) ? null : <ReadOnlyNote project={project.name} admins={adminNames(project)} />;
}

/** You as the board shows you: your saved name and its initials, not the sample's. */
export function useMemberName() {
  const { profile } = useSettings();
  return (m: ProjectMember) => (m.id === ME ? { name: profile.name, initials: initialsOf(profile.name) } : { name: m.name, initials: m.initials });
}

/* ── General ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** What each role does, in the live settings' words for a member and the docs' for an admin (guide, "Who can see and do what"). */
const ROLE_DOES: Record<ProjectRole, string> = {
  member: "describes and approves the work",
  admin: "describes and approves the work, invites people and changes what they may do",
};

// The live page's three blocks, each under its scope: the project's name (with what it's about, its colour and its story
// IDs, which the live page doesn't have), your role here, and how many stories are worked on at once.
export function GeneralSection({ project, notify }: SectionProps) {
  const edit = isAdmin(project);

  // Each number applies on its own and at once, so Undo rather than Save (DESIGN.md §6.11).
  const setAtOnce = (key: "buildingAtOnce" | "planningAtOnce", label: string) => (n: number) => {
    const before = project[key];
    if (n === before) return;
    updateProject(project.id, (p) => ({ ...p, [key]: n }));
    notify(`${label} is now ${n}`, { label: "Undo", run: () => updateProject(project.id, (p) => ({ ...p, [key]: before })) });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={scopeOf(project)} title="General">
        {project.name}'s name and colour, your role in it, and how many stories are worked on at once.
      </PageHeader>
      <MemberNote project={project} />
      <GeneralForm key={project.id} project={project} notify={notify} />

      <Group scope={youIn(project)} title="Your role">
        <p className="m-0 text-sm text-[var(--tx)]">
          <span className="font-medium">{ROLE_LABEL[project.yourRole]}</span> · {ROLE_DOES[project.yourRole]}
        </p>
        <p className="m-0 mt-1.5 text-xs text-[var(--tx2)]">
          A project admin changes roles under{" "}
          <a href={`/settings?tab=people&project=${encodeURIComponent(project.id)}`} className={LINK}>
            People
          </a>
          .
        </p>
      </Group>

      <Group
        scope={scopeOf(project)}
        title="Stories worked on at once"
        description={`Applies to everyone in this project. A change reaches each person's robots as soon as they have nothing in progress (usually within a few minutes), or when their workspace next starts. It never interrupts work under way.${edit ? "" : " A project admin can change it."}`}
      >
        <ul className="m-0 flex list-none flex-col p-0">
          <li className={AT_ONCE_ROW}>
            <div className="min-w-0 flex-1 basis-64">
              <p id="building-at-once" className="m-0 text-sm font-medium text-[var(--tx)]">
                Building at the same time
              </p>
              <p className="m-0 mt-0.5 text-xs text-pretty text-[var(--tx2)]">
                How many stories each person's robots can build at the same time (6 to 8). Approved stories past that stay
                Queued. More than 6 at once may slow down screenshots on the standard machine.
              </p>
            </div>
            {edit ? (
              // Three choices, so a segmented control (DESIGN.md §7.4, §7.11).
              <Segmented
                name={`building-at-once-${project.id}`}
                labelledBy="building-at-once"
                value={project.buildingAtOnce}
                options={BUILDING_AT_ONCE}
                onChange={setAtOnce("buildingAtOnce", "Building at the same time")}
              />
            ) : (
              <span className={AT_ONCE_VALUE}>{project.buildingAtOnce}</span>
            )}
          </li>
          <li className={AT_ONCE_ROW}>
            <div className="min-w-0 flex-1 basis-64">
              {edit ? (
                <label htmlFor="planning-at-once" className="block text-sm font-medium text-[var(--tx)]">
                  Planning at the same time
                </label>
              ) : (
                <p className="m-0 text-sm font-medium text-[var(--tx)]">Planning at the same time</p>
              )}
              <p id="planning-at-once-hint" className="m-0 mt-0.5 text-xs text-pretty text-[var(--tx2)]">
                How many stories each person's robots can plan, or answer notes on, at the same time (1 to 8).
              </p>
            </div>
            {edit ? (
              // Eight choices, so a select.
              <SelectField
                id="planning-at-once"
                value={String(project.planningAtOnce)}
                onChange={(v) => setAtOnce("planningAtOnce", "Planning at the same time")(Number(v))}
                describedBy="planning-at-once-hint"
                className="w-20 flex-none [&_select]:tabular-nums"
              >
                {PLANNING_AT_ONCE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </SelectField>
            ) : (
              <span className={AT_ONCE_VALUE}>{project.planningAtOnce}</span>
            )}
          </li>
        </ul>
      </Group>
    </div>
  );
}

const AT_ONCE_ROW = "flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0 last:pb-0";
/** Read-only, for members: the number alone, as on the live page. */
const AT_ONCE_VALUE = "flex-none text-sm font-medium tabular-nums text-[var(--tx)]";

function GeneralForm({ project, notify }: SectionProps) {
  const edit = isAdmin(project);
  const stored = { name: project.name, description: project.description, colour: project.colour };
  const signature = JSON.stringify(stored);
  const [draft, setDraft] = useState(stored);
  const [seen, setSeen] = useState(signature);
  const [error, setError] = useState("");
  const colourName = useId();

  // The stored values arrive right after hydration: start from them when they do.
  if (signature !== seen) {
    setSeen(signature);
    setDraft(stored);
  }
  const dirty = JSON.stringify(draft) !== signature;
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Several fields that apply together, so they have Save (DESIGN.md §6.13), at the bottom left (§6.14).
  const save = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.name.trim()) return setError("Enter a name for the project.");
    setError("");
    const next = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    setDraft(next);
    updateProject(project.id, (p) => ({ ...p, ...next }));
    notify("Project saved");
  };

  const colour = PROJECT_COLOURS.find((c) => c.value === draft.colour);

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <Group>
        <div className="flex flex-col gap-5">
          <Field label="Project name" htmlFor="project-name" error={error}>
            <input
              id="project-name"
              value={draft.name}
              readOnly={!edit}
              onChange={(e) => {
                set({ name: e.target.value });
                if (error && e.target.value.trim()) setError("");
              }}
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "project-name-error" : undefined}
              className={edit ? FIELD : FIELD_READ}
            />
          </Field>
          <Field
            label="What it's about"
            htmlFor="project-description"
            optional={edit}
            hint={edit ? "A sentence or two for the robots: who it's for and what it does. They read it before every story." : undefined}
          >
            {edit ? (
              <textarea
                id="project-description"
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                aria-describedby="project-description-hint"
                className={`${FIELD} field-sizing-content h-auto max-h-72 min-h-20 resize-y py-2`}
              />
            ) : (
              <p id="project-description" className="m-0 text-sm text-pretty text-[var(--tx)]">
                {project.description || "Nothing written yet."}
              </p>
            )}
          </Field>
          {edit ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="p-0 text-sm font-medium text-[var(--tx)]">Colour</legend>
              <p className="m-0 mt-0.5 text-xs text-[var(--tx2)]">Beside the project's name wherever it's listed.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PROJECT_COLOURS.map((c) => (
                  <label key={c.value} className="relative flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-hover">
                    <input
                      type="radio"
                      name={colourName}
                      value={c.value}
                      checked={draft.colour === c.value}
                      onChange={() => set({ colour: c.value })}
                      aria-label={c.name}
                      className="peer sr-only"
                    />
                    {/* The 16 px rounded square (DESIGN.md §4.4); the chosen one gets a ring, keyboard focus the outline. */}
                    <span
                      aria-hidden="true"
                      style={{ background: c.value }}
                      className="size-4 rounded-sm ring-offset-2 peer-checked:ring-2 peer-checked:ring-[var(--tx)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--focus)]"
                    />
                  </label>
                ))}
              </div>
              <p className="m-0 mt-1 text-xs text-[var(--tx2)]">{colour?.name}</p>
            </fieldset>
          ) : (
            // Read-only: just the colour it has, as a value.
            <div>
              <p className="m-0 text-sm font-medium text-[var(--tx)]">Colour</p>
              <p className="m-0 mt-1.5 flex items-center gap-2 text-sm text-[var(--tx)]">
                <span aria-hidden="true" style={{ background: project.colour }} className="size-4 rounded-sm" />
                {colour?.name ?? "Custom"}
              </p>
            </div>
          )}
          <Field label="Story IDs" htmlFor="project-prefix" hint="Set when the project was made, so links to its stories never break.">
            <input
              id="project-prefix"
              value={`${project.prefix}-1, ${project.prefix}-2, ${project.prefix}-3…`}
              readOnly
              className={`${FIELD_READ} font-mono`}
            />
          </Field>
        </div>
      </Group>
      {edit && (
        <div className="flex gap-2">
          <button type="submit" className={BTN_PRIMARY}>
            Save changes
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setDraft(stored);
                setError("");
              }}
              className={BTN_SECONDARY}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/* ── People ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABEL: Record<ProjectRole, string> = { admin: "Admin", member: "Member" };

export function PeopleSection({ project, notify }: SectionProps) {
  const edit = isAdmin(project);
  const nameOf = useMemberName();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const invite = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) return setError("Enter an email address, like maya@wepop.app.");
    if (project.members.some((m) => m.email === address)) return setError(`${address} is already in ${project.name}.`);
    if (project.invites.some((i) => i.email === address)) return setError(`${address} is already invited. Resend it below.`);
    updateProject(project.id, (p) => ({ ...p, invites: [...p.invites, { id: `inv-${Date.now()}`, email: address, role, sent: todayYmd() }] }));
    notify(`Invite sent to ${address}`);
    setEmail("");
    setRole("member");
    setError("");
  };

  const setMemberRole = (id: string, next: ProjectRole) => {
    const m = project.members.find((x) => x.id === id);
    if (!m) return;
    const before = m.role;
    const withRole = (r: ProjectRole) => (p: ProjectSettings) => ({ ...p, members: p.members.map((x) => (x.id === id ? { ...x, role: r } : x)) });
    updateProject(project.id, withRole(next));
    notify(`${m.name} is now ${next === "admin" ? "an admin" : "a member"}`, { label: "Undo", run: () => updateProject(project.id, withRole(before)) });
  };

  const cancelInvite = (id: string) => {
    const inv = project.invites.find((i) => i.id === id);
    if (!inv) return;
    updateProject(project.id, (p) => ({ ...p, invites: p.invites.filter((i) => i.id !== id) }));
    notify(`Invite to ${inv.email} cancelled`, { label: "Undo", run: () => updateProject(project.id, (p) => ({ ...p, invites: [...p.invites, inv] })) });
  };

  const remove = () => {
    const m = project.members.find((x) => x.id === removing);
    setRemoving(null);
    if (!m) return;
    updateProject(project.id, (p) => ({
      ...p,
      members: p.members.filter((x) => x.id !== m.id),
      // Whoever merged can't any more: GitHub access then asks for someone else.
      merger: p.merger === m.id ? "" : p.merger,
    }));
    notify(`${m.name} removed from ${project.name}`);
  };

  const removingMember = project.members.find((m) => m.id === removing);
  const me = project.members.find((m) => m.id === ME);
  const ordered = me ? [me, ...project.members.filter((m) => m.id !== ME)] : project.members;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={scopeOf(project)} title="People">
        Who's in {project.name}, and their invitations. Everyone can write, move and approve every story; admins can also
        invite people and change what someone else may do.
      </PageHeader>
      <MemberNote project={project} />
      {edit && (
        <Group title="Invite someone">
          <form onSubmit={invite} noValidate>
            <Field label="Email" htmlFor="invite-email" error={error} hint="They get an email with a link to join. It works for 7 days.">
              <div className="flex flex-wrap gap-2">
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="name@company.com"
                  autoComplete="off"
                  aria-invalid={!!error}
                  aria-describedby={error ? "invite-email-error" : "invite-email-hint"}
                  className={`${FIELD} min-w-0 flex-1 basis-56`}
                />
                <label htmlFor="invite-role" className="sr-only">
                  Role
                </label>
                <SelectField id="invite-role" value={role} onChange={(v) => setRole(v as ProjectRole)} className="w-32">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </SelectField>
                <button type="submit" className={BTN_PRIMARY}>
                  Send invite
                </button>
              </div>
            </Field>
          </form>
        </Group>
      )}
      <Group title={`${project.members.length} ${project.members.length === 1 ? "person" : "people"}`}>
        <ul className="m-0 flex list-none flex-col p-0">
          {ordered.map((m) => {
            const you = m.id === ME;
            const shown = nameOf(m);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0">
                <PersonAvatar initials={shown.initials} size={32} />
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate text-sm font-medium text-[var(--tx)]">
                    {shown.name}
                    {you && <span className="font-normal text-[var(--tx2)]"> (you)</span>}
                  </span>
                  <span className="block truncate text-xs text-[var(--tx2)]">{m.email}</span>
                </span>
                {edit && !you ? (
                  <span className="flex items-center gap-2">
                    <label htmlFor={`role-${m.id}`} className="sr-only">
                      {m.name}'s role
                    </label>
                    <SelectField id={`role-${m.id}`} value={m.role} onChange={(v) => setMemberRole(m.id, v as ProjectRole)} className="w-32">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </SelectField>
                    <button type="button" onClick={() => setRemoving(m.id)} aria-label={`Remove ${m.name}`} className={GHOST}>
                      Remove
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-[var(--tx2)]">{ROLE_LABEL[m.role]}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Group>
      {project.invites.length > 0 && (
        <Group title="Invitations">
          <ul className="m-0 flex list-none flex-col p-0">
            {project.invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0">
                <span className="flex size-8 flex-none items-center justify-center rounded-full bg-field">
                  <Mail aria-hidden="true" size={14} strokeWidth={2} className="text-[var(--tx2)]" />
                </span>
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate text-sm text-[var(--tx)]">{inv.email}</span>
                  <span className="block text-xs text-[var(--tx2)]">
                    {ROLE_LABEL[inv.role]} · invited {formatDate(inv.sent)}
                  </span>
                </span>
                {edit && (
                  <span className="flex gap-2">
                    <button type="button" onClick={() => notify(`Invite sent again to ${inv.email}`)} className={BTN_SECONDARY}>
                      Resend
                    </button>
                    <button type="button" onClick={() => cancelInvite(inv.id)} className={GHOST}>
                      Cancel invite
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Group>
      )}
      <ConfirmDialog
        open={!!removingMember}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title={`Remove ${removingMember?.name ?? "this person"} from ${project.name}?`}
        consequence={
          removingMember && project.merger === removingMember.id
            ? "They lose access to its stories, and they merge its pull requests: choose someone else in GitHub access."
            : "They lose access to its stories. Stories they own go to you to hand on."
        }
        confirmLabel="Remove"
      />
    </div>
  );
}

/* ── GitHub access ───────────────────────────────────────────────────────────────────────────────────────────── */

// The live page's parts, and only those (Shubham's two screenshots, 27 Nov): the project's level beside "See
// levels", which opens the three levels and what each allows ("Close" shuts it again); then, under "You, in this
// project", the repositories your own access is added to, and where your credentials and cap live. The page says a
// project admin chooses the level, so an admin picks it where the levels are listed.

const ACCESS_VIA = { app: "App", account: "Account", token: "Token" } as const;
/** A neutral tag (DESIGN.md §7.12): a value, not a state. */
const TAG = "inline-flex h-5 flex-none items-center rounded-md bg-field px-1.5 text-xs font-medium whitespace-nowrap text-[var(--tx)]";

export function GitHubAccessSection({ project, notify }: SectionProps) {
  const edit = isAdmin(project);
  const [open, setOpen] = useState(false);
  const yours = project.repositories.filter((r) => r.reachedBy?.member === ME);

  // Applies at once, so Undo rather than Save (DESIGN.md §6.11).
  const setLevel = (level: GitHubLevel) => {
    const before = project.githubLevel;
    if (level === before) return;
    updateProject(project.id, (p) => ({ ...p, githubLevel: level }));
    notify(`${project.name} is now at ${levelLabel(level)}`, { label: "Undo", run: () => updateProject(project.id, (p) => ({ ...p, githubLevel: before })) });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={scopeOf(project)} title="GitHub access">
        What CraftHQ may do on GitHub for <span className="font-semibold text-[var(--tx)]">{project.name}</span>. A project admin chooses the
        level; your own cap, if you set one, can only lower it for your work.
      </PageHeader>

      <Group>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="m-0 text-sm font-medium text-[var(--tx)]">What CraftHQ may do on GitHub</p>
          <span className={TAG}>{levelLabel(project.githubLevel)}</span>
          <button type="button" aria-expanded={open} aria-controls="github-levels" onClick={() => setOpen(!open)} className={BTN_SECONDARY}>
            {open ? "Close" : "See levels"}
          </button>
        </div>
        {/* The spacing only while it's open: a display class would win over the `hidden` attribute. */}
        <div id="github-levels" hidden={!open} className={open ? "mt-4" : undefined}>
          <p className="m-0 text-xs text-[var(--tx2)]">A project admin chooses the level.</p>
          <ul
            role={edit ? "radiogroup" : undefined}
            aria-label={edit ? "What CraftHQ may do on GitHub" : undefined}
            className="m-0 mt-2 flex list-none flex-col gap-2 p-0"
          >
            {LEVELS.map((level) => {
              const l = GITHUB_LEVELS[level];
              const current = level === project.githubLevel;
              const id = `github-level-${project.id}-${level}`;
              const title = (
                <>
                  <span className="text-xs font-medium text-[var(--tx2)]">Level {level}</span>
                  <span className="text-sm font-semibold text-[var(--tx)]">{l.name}</span>
                </>
              );
              return (
                // A card (DESIGN.md §7.16): white, a hairline, 16 px. The current one has the stronger hairline and says so.
                <li key={level} className={`rounded-xl bg-white p-4 ring-1 ring-inset ${current ? "ring-black/[0.2]" : "ring-black/[0.08]"}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {edit && (
                      <input
                        type="radio"
                        id={id}
                        name={`github-level-${project.id}`}
                        checked={current}
                        onChange={() => setLevel(level)}
                        aria-describedby={`${id}-summary`}
                        className={RADIO}
                      />
                    )}
                    {edit ? (
                      <label htmlFor={id} className="flex cursor-pointer items-baseline gap-2">
                        {title}
                      </label>
                    ) : (
                      <p className="m-0 flex items-baseline gap-2">{title}</p>
                    )}
                    {current && (
                      <Pill tone="positive" icon={Check}>
                        Current
                      </Pill>
                    )}
                  </div>
                  <div className={edit ? "pl-6" : undefined}>
                    <p id={`${id}-summary`} className="m-0 mt-1 text-sm text-[var(--tx)]">
                      {l.summary}
                    </p>
                    <p className="m-0 mt-3 text-xs font-medium text-[var(--tx2)]">{l.heading}</p>
                    <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                      {l.allows.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-sm text-[var(--tx)]">
                          <span className="flex h-5 flex-none items-center">
                            <Plus aria-hidden="true" size={14} strokeWidth={2} className="text-success-ink" />
                          </span>
                          {a}
                        </li>
                      ))}
                    </ul>
                    <p className="m-0 mt-3 text-xs text-pretty text-[var(--tx2)]">{l.limits}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Group>

      <Group scope={youIn(project)} title="Your access to this project's repositories">
        {yours.length === 0 ? (
          <p className="m-0 text-sm text-[var(--tx2)]">Your access is not added to any repository of this project yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {yours.map((r) => (
              <li key={r.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                <span className="min-w-0 flex-1 font-mono text-sm break-all text-[var(--tx)]">{r.name}</span>
                <span className={TAG}>{ACCESS_VIA[r.reachedBy?.via ?? "app"]}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 mt-3 text-xs text-[var(--tx2)]">
          Your credentials and your own cap are in{" "}
          <a href="/settings?tab=github" className={LINK}>
            Your settings › GitHub
          </a>
          .
        </p>
      </Group>
    </div>
  );
}

/* ── Issue tracker (the project's tracker mapping) ───────────────────────────────────────────────────────────── */

export function ProjectTrackerSection({ project, notify }: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={scopeOf(project)} title="Issue tracker">
        Which tracker {project.name}'s tickets live in, and the status there that matches each column of the board.
      </PageHeader>
      <MemberNote project={project} />
      <TrackerForm key={project.id} project={project} notify={notify} />
    </div>
  );
}

function TrackerForm({ project, notify }: SectionProps) {
  const edit = isAdmin(project);
  const connected = useConnectedTools();
  const signature = JSON.stringify(project.tracker);
  const [draft, setDraft] = useState<ProjectTracker>(project.tracker);
  const [seen, setSeen] = useState(signature);
  const [error, setError] = useState("");

  // The stored mapping arrives right after hydration: start from it when it does.
  if (signature !== seen) {
    setSeen(signature);
    setDraft(project.tracker);
  }
  const tool = TOOLS.find((t) => t.id === draft.tool);
  const dirty = JSON.stringify(draft) !== signature;

  const save = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tool && !draft.project.trim()) return setError(`Enter the project in ${tool.name}, like WEP.`);
    setError("");
    const next = { ...draft, project: draft.project.trim() };
    setDraft(next);
    updateProject(project.id, (p) => ({ ...p, tracker: next }));
    notify("Issue tracker saved");
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <Group>
        <div className="flex flex-col gap-5">
          <Field
            label="Tracker"
            htmlFor="tracker-tool"
            hint={
              tool && !connected.includes(tool.id) ? (
                <>
                  You haven't connected {tool.name} yet.{" "}
                  <a href="/settings?tab=tracker" className={LINK}>
                    Connect it in Your settings
                  </a>{" "}
                  to import its tickets.
                </>
              ) : (
                "Stories can start from its tickets, and link back to them."
              )
            }
          >
            {edit ? (
              <SelectField
                id="tracker-tool"
                value={draft.tool}
                onChange={(v) => setDraft((d) => ({ ...d, tool: v }))}
                describedBy="tracker-tool-hint"
                className="max-w-xs"
              >
                <option value="">None</option>
                {TOOLS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            ) : (
              <input id="tracker-tool" value={tool?.name ?? "None"} readOnly className={FIELD_READ} />
            )}
          </Field>
          {tool && (
            <Field label={`Project in ${tool.name}`} htmlFor="tracker-project" error={error} hint="The project its tickets come from, like WEP in Jira.">
              <input
                id="tracker-project"
                value={draft.project}
                readOnly={!edit}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, project: e.target.value }));
                  if (error) setError("");
                }}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!!error}
                aria-describedby={error ? "tracker-project-error" : "tracker-project-hint"}
                className={`${edit ? FIELD : FIELD_READ} max-w-xs font-mono`}
              />
            </Field>
          )}
        </div>
      </Group>
      {tool && (
        <Group title="Statuses" description={`The status in ${tool.name} that matches each column of the board.`}>
          <table className="w-full max-w-md border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-line)]">
                <th scope="col" className="h-8 w-40 pr-3 text-left text-xs font-medium text-[var(--tx2)]">
                  On the board
                </th>
                <th scope="col" className="h-8 text-left text-xs font-medium text-[var(--tx2)]">
                  In {tool.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {FLOW_COLUMNS.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-b-0">
                  <th scope="row" className="py-2 pr-3 text-left text-sm font-normal text-[var(--tx)]">
                    {c.label}
                  </th>
                  <td className="py-2">
                    <input
                      aria-label={`${tool.name} status for ${c.label}`}
                      value={draft.statuses[c.id]}
                      readOnly={!edit}
                      onChange={(e) => setDraft((d) => ({ ...d, statuses: { ...d.statuses, [c.id]: e.target.value } }))}
                      autoComplete="off"
                      className={edit ? FIELD : FIELD_READ}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Group>
      )}
      {edit && (
        <div className="flex gap-2">
          <button type="submit" className={BTN_PRIMARY}>
            Save changes
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setDraft(project.tracker);
                setError("");
              }}
              className={BTN_SECONDARY}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}
