import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Check, ChevronRight, CircleAlert, CircleX, LoaderCircle, Minus, X } from "lucide-react";
import { BTN_SECONDARY } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import type { ProjectMember, ProjectRepository, ProjectSettings, RepoAccess, RepositorySetup, SetupStepState } from "@/types/settings";
import { GHOST, MemberNote, isAdmin, scopeOf, useMemberName, type SectionProps } from "./ProjectSections";
import { ME, REACHABLE_REPOSITORIES, SETUP_RUN_MS, SETUP_STEPS, setupState, startedSetup, stepsAt, updateProject, type SetupState } from "./store";
import { Field, Group, MetaLine, Notice, PageHeader, Pill, SelectField, usePageNow } from "./ui";

// Project settings › Repositories, with the live page's parts (Shubham's screenshot, 27 Nov): whether setup is ready,
// then each repository with its base branch, its state, code only or harness, whose access reaches it, its boot
// contract and its seven steps; and the note on who manages access. The live page prints every step of every
// repository, fourteen times over. Here a repository is one row that says what matters (ready or not, and your own
// access), and its steps open under it: technical detail belongs in a disclosure (DESIGN.md §6.9). A row opens by
// itself only while its setup is running or has failed, and its pill is worked out from its steps, so it can't say
// Ready over a step that failed.
//
// Kept from before, for admins: who can read and write each repository, and adding one. Sample data; a setup started
// here (Add repository, Run setup again) is played through by the browser (store.ts, stepsAt).

const safeId = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-");
const repositories = (n: number) => (n === 1 ? "1 repository" : `${n} repositories`);

const VIA: Record<NonNullable<ProjectRepository["reachedBy"]>["via"], string> = {
  app: "CraftHQ App",
  account: "GitHub account",
  token: "developer token",
};

/** Mid-line, so lower case: "base main · you can write". */
const YOUR_ACCESS: Record<RepoAccess, string> = { write: "you can write", read: "you can read", none: "no access for you" };

/** The two kinds of setup, and what each means for the people working in the repository (the live step's words). */
const KINDS: Record<RepositorySetup["contract"], { tag: string; means: string; contract: string }> = {
  none: {
    tag: "Code only",
    means: "Code only: stories can work in this repository, with no boot proof and no preview.",
    contract: "None (code only)",
  },
  file: {
    tag: "Harness",
    means: "Harness: stories can work in this repository, with boot proof and previews.",
    contract: "Repository file",
  },
};

/** A neutral tag (DESIGN.md §7.12): what kind of setup, not a state. */
const TAG = "inline-flex h-5 flex-none items-center rounded-md bg-field px-1.5 text-xs font-medium whitespace-nowrap text-[var(--tx)]";

export function RepositoriesSection({ project, notify }: SectionProps) {
  const edit = isAdmin(project);
  const nameOf = useMemberName();
  const [adding, setAdding] = useState("");
  // Rows the person opened or closed themselves; the rest open only while they need attention.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const opened = usePageNow();
  const [tick, setTick] = useState(0);
  const now = Math.max(opened, tick);
  // The setups started on this page, to say so when each finishes.
  const watching = useRef(new Set<string>());

  const repos = project.repositories;
  const playing = repos.some((r) => r.setup.startedAt !== undefined && (!now || now - r.setup.startedAt < SETUP_RUN_MS));

  // While a setup started in this browser plays through, look again four times a second.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const at = Date.now();
      setTick(at);
      for (const r of repos) {
        if (r.setup.startedAt !== undefined && at - r.setup.startedAt >= SETUP_RUN_MS && watching.current.delete(`${r.name}:${r.setup.startedAt}`)) {
          notify(`${r.name} is ready. Stories can be created in it.`);
        }
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, repos, notify]);

  const rows = repos.map((repo) => {
    const steps = stepsAt(repo, now);
    return { repo, steps, state: setupState(steps) };
  });
  const named = (state: SetupState) => rows.filter((r) => r.state === state).map((r) => r.repo.name);
  const available = REACHABLE_REPOSITORIES.filter((r) => !repos.some((x) => x.name === r));

  /** A setup that starts now: watched until it finishes, and its row open so the steps can be seen going by. */
  const start = (name: string) => {
    const setup = startedSetup();
    watching.current.add(`${name}:${setup.startedAt}`);
    setToggled((t) => ({ ...t, [name]: true }));
    return setup;
  };

  const add = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adding) return;
    const setup = start(adding);
    updateProject(project.id, (p) => ({
      ...p,
      repositories: [
        ...p.repositories,
        {
          name: adding,
          base: "main",
          // Admins can write to a new repository and members can read it, until someone changes that.
          access: Object.fromEntries(p.members.map((m) => [m.id, m.role === "admin" ? "write" : "read"])),
          reachedBy: { member: ME, via: "app" },
          setup,
        },
      ],
    }));
    notify(`${adding} added to ${project.name}. Setting it up now.`);
    setAdding("");
  };

  const runAgain = (name: string) => {
    const setup = start(name);
    updateProject(project.id, (p) => ({
      ...p,
      repositories: p.repositories.map((r) => (r.name === name ? { ...r, reachedBy: r.reachedBy ?? { member: ME, via: "app" }, setup } : r)),
    }));
  };

  const setAccess = (repo: string, member: ProjectMember, access: RepoAccess) => {
    const before = repos.find((r) => r.name === repo)?.access[member.id] ?? "none";
    const withAccess = (a: RepoAccess) => (p: ProjectSettings) => ({
      ...p,
      repositories: p.repositories.map((r) => (r.name === repo ? { ...r, access: { ...r.access, [member.id]: a } } : r)),
    });
    updateProject(project.id, withAccess(access));
    const who = nameOf(member).name;
    const what = access === "write" ? `can now write to ${repo}` : access === "read" ? `can now only read ${repo}` : `no longer has access to ${repo}`;
    notify(`${who} ${what}`, { label: "Undo", run: () => updateProject(project.id, withAccess(before)) });
  };

  const remove = (name: string) => {
    const index = repos.findIndex((r) => r.name === name);
    const repo = repos[index];
    if (!repo) return;
    updateProject(project.id, (p) => ({ ...p, repositories: p.repositories.filter((r) => r.name !== name) }));
    notify(`${name} removed from ${project.name}`, {
      label: "Undo",
      run: () => updateProject(project.id, (p) => ({ ...p, repositories: [...p.repositories.slice(0, index), repo, ...p.repositories.slice(index)] })),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader scope={scopeOf(project)} title="Repositories">
        Each repository's setup, and your own access to it. A project admin adds repositories. Stories can be created once a
        repository's setup is Ready.
      </PageHeader>
      <MemberNote project={project} />

      <Group title="Setup">
        {rows.length === 0 ? (
          <p className="m-0 text-sm text-[var(--tx2)]">
            No repositories yet. {edit ? `Add the one ${project.name}'s code lives in, below.` : "A project admin adds them."}
          </p>
        ) : (
          <>
            <SetupNotice ready={named("ready").length} failed={named("failed")} running={named("running")} />
            <ul className="m-0 mt-2 flex list-none flex-col p-0">
              {rows.map(({ repo, steps, state }) => {
                const open = toggled[repo.name] ?? state !== "ready";
                return (
                  <RepositoryRow
                    key={repo.name}
                    repo={repo}
                    steps={steps}
                    state={state}
                    reachedBy={repo.reachedBy ? project.members.find((m) => m.id === repo.reachedBy?.member) : undefined}
                    edit={edit}
                    open={open}
                    onToggle={() => setToggled((t) => ({ ...t, [repo.name]: !open }))}
                    onRunAgain={() => runAgain(repo.name)}
                  />
                );
              })}
            </ul>
          </>
        )}
      </Group>

      {edit ? (
        rows.length > 0 && (
          <Group title="Who can read and write" description="Each change applies at once.">
            {/* Wider than a phone: it scrolls sideways there, with the repository column first (DESIGN.md §5.5).
                `relative` keeps the cells' sr-only labels inside the scroller; further out, they'd stretch the page. */}
            <div className="relative -mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--card-line)]">
                    <th scope="col" className="h-8 pr-3 text-left text-xs font-medium text-[var(--tx2)]">
                      Repository
                    </th>
                    {project.members.map((m) => (
                      <th key={m.id} scope="col" className="h-8 px-2 text-left text-xs font-medium text-[var(--tx2)]">
                        <span className="flex items-center gap-1.5">
                          <PersonAvatar initials={nameOf(m).initials} size={20} />
                          <span className="max-w-24 truncate">
                            {nameOf(m).name.split(" ")[0]}
                            {m.id === ME && " (you)"}
                          </span>
                        </span>
                      </th>
                    ))}
                    <th scope="col" className="h-8 pl-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((r) => (
                    <tr key={r.name} className="border-b border-[var(--line)] last:border-b-0">
                      <th scope="row" className="py-2.5 pr-3 text-left align-middle font-normal">
                        <span className="block font-mono text-xs text-[var(--tx)]">{r.name}</span>
                        <span className="block text-xs text-[var(--tx2)]">
                          Pull requests go into <span className="font-mono">{r.base}</span>
                        </span>
                      </th>
                      {project.members.map((m) => {
                        const id = `access-${safeId(r.name)}-${m.id}`;
                        return (
                          <td key={m.id} className="px-2 py-2.5 align-middle">
                            <label htmlFor={id} className="sr-only">
                              {nameOf(m).name}'s access to {r.name}
                            </label>
                            <SelectField id={id} value={r.access[m.id] ?? "none"} onChange={(v) => setAccess(r.name, m, v as RepoAccess)} className="w-24">
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </SelectField>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-2 text-right align-middle">
                        <button type="button" onClick={() => remove(r.name)} aria-label={`Remove ${r.name}`} className={GHOST}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Group>
        )
      ) : (
        <p className="m-0 text-xs text-[var(--tx2)]">A project admin manages who may read and write each repository.</p>
      )}

      {edit && (
        <Group title="Add a repository">
          {available.length === 0 ? (
            <p className="m-0 text-sm text-[var(--tx2)]">Every repository GitHub lets CraftHQ reach is already here.</p>
          ) : (
            <form onSubmit={add} noValidate>
              <Field label="Repository" htmlFor="repo-add" hint="The repositories GitHub lets CraftHQ reach. Setup starts as soon as one is added.">
                <div className="flex flex-wrap gap-2">
                  <SelectField
                    id="repo-add"
                    value={adding}
                    onChange={setAdding}
                    describedBy="repo-add-hint"
                    className={`min-w-0 flex-1 basis-56 ${adding ? "[&_select]:font-mono" : ""}`}
                  >
                    <option value="">Choose a repository</option>
                    {available.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </SelectField>
                  {/* Stays focusable with nothing chosen (aria-disabled), and the hint above says what to do. */}
                  <button type="submit" aria-disabled={!adding || undefined} className={`${BTN_SECONDARY} ${adding ? "" : "cursor-default opacity-50"}`}>
                    Add repository
                  </button>
                </div>
              </Field>
            </form>
          )}
        </Group>
      )}
    </div>
  );
}

/**
 * The live page's "Setup is Ready, stories can be created", for every case: stories can be created once one
 * repository is ready, so a failed or running one doesn't stop them, and the line says both.
 */
function SetupNotice({ ready, failed, running }: { ready: number; failed: string[]; running: string[] }) {
  // One repository is named, so it can be found in a long list; more are counted, and their rows are open below.
  const which = (names: string[]) => (names.length === 1 ? <span className="font-mono">{names[0]}</span> : repositories(names.length));
  if (failed.length > 0) {
    return (
      <Notice tone="attention" icon={CircleAlert} live>
        Setup failed for {which(failed)}.{" "}
        {ready > 0
          ? `Stories can still be created: ${ready === 1 ? "1 repository is" : `${ready} repositories are`} ready.`
          : "Stories can be created once a repository's setup is ready."}
      </Notice>
    );
  }
  if (running.length > 0) {
    return (
      <Notice tone="neutral" icon={LoaderCircle} spin live>
        Setting up {which(running)}. {ready > 0 ? "Stories can be created meanwhile." : `Stories can be created once ${running.length === 1 ? "it's" : "one is"} ready.`}
      </Notice>
    );
  }
  return (
    <Notice tone="positive" icon={Check} live>
      Setup is ready. Stories can be created.
    </Notice>
  );
}

function StatePill({ state }: { state: SetupState }) {
  if (state === "ready") {
    return (
      <Pill tone="positive" icon={Check}>
        Ready
      </Pill>
    );
  }
  if (state === "failed") {
    return (
      <Pill tone="negative" icon={CircleX}>
        Setup failed
      </Pill>
    );
  }
  return (
    <Pill tone="neutral" icon={LoaderCircle} spin>
      Setting up
    </Pill>
  );
}

/** For screen readers and the mark's tooltip: every state has a shape of its own, and a word. */
const STEP_STATES: Record<SetupStepState, string> = {
  done: "done",
  skipped: "not needed",
  failed: "failed",
  waiting: "waiting",
  running: "running now",
};

function StepMark({ state }: { state: SetupStepState }) {
  if (state === "done") return <Check aria-hidden="true" size={14} strokeWidth={2} className="text-success-ink" />;
  if (state === "failed") return <X aria-hidden="true" size={14} strokeWidth={2} className="text-danger-ink" />;
  if (state === "skipped") return <Minus aria-hidden="true" size={14} strokeWidth={2} className="text-[var(--tx2)]" />;
  if (state === "running") return <LoaderCircle aria-hidden="true" size={14} strokeWidth={2} className="animate-spin text-[var(--tx)] motion-reduce:animate-none" />;
  return <span aria-hidden="true" className="size-1 rounded-full bg-faint" />;
}

/**
 * One repository: a row that says what matters (its state, code only or harness, its base branch and your own access),
 * and under it the live page's detail: the boot contract, whose access reaches it, and the seven steps.
 */
function RepositoryRow({
  repo,
  steps,
  state,
  reachedBy,
  edit,
  open,
  onToggle,
  onRunAgain,
}: {
  repo: ProjectRepository;
  steps: RepositorySetup["steps"];
  state: SetupState;
  reachedBy: ProjectMember | undefined;
  edit: boolean;
  open: boolean;
  onToggle: () => void;
  onRunAgain: () => void;
}) {
  const nameOf = useMemberName();
  const panel = `setup-${safeId(repo.name)}`;
  // Code only or harness is known once the contract has been checked: a setup that stopped before it has no kind yet.
  const kind = steps.contract.state === "done" ? KINDS[repo.setup.contract] : undefined;
  const stopped = SETUP_STEPS.find((s) => steps[s.id].state === "failed");
  const whose = reachedBy ? (reachedBy.id === ME ? "your" : `${nameOf(reachedBy).name}'s`) : undefined;

  return (
    <li className="border-b border-[var(--line)] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-lg px-2 py-3 text-left transition-colors duration-[120ms] hover:bg-hover"
      >
        <span className="flex h-5 flex-none items-center">
          <ChevronRight
            aria-hidden="true"
            size={16}
            strokeWidth={1.75}
            className={`text-[var(--tx2)] transition-transform duration-[120ms] motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm font-medium break-all text-[var(--tx)]">{repo.name}</span>
            <StatePill state={state} />
            {kind && <span className={TAG}>{kind.tag}</span>}
          </span>
          <MetaLine
            className="mt-0.5"
            parts={[
              <>
                base <span className="font-mono">{repo.base}</span>
              </>,
              YOUR_ACCESS[repo.access[ME] ?? "none"],
              whose && `through ${whose} access`,
            ]}
          />
        </span>
      </button>

      {/* The layout classes only while it's open: `flex` would win over the `hidden` attribute and show a closed row. */}
      <div id={panel} hidden={!open} className={open ? "flex flex-col gap-3 pb-4 pl-6" : undefined}>
        {stopped ? (
          // What failed and the next step (DESIGN.md §6.9), which the live page leaves out.
          <Notice tone="negative" icon={CircleX}>
            <p className="m-0">
              Setup stopped at <span className="font-medium">{stopped.name}</span>. {steps[stopped.id].detail}{" "}
              {edit ? "Check that the branch exists and that CraftHQ can reach this repository, then run setup again." : "A project admin can run setup again."}
            </p>
            {edit && (
              <button type="button" onClick={onRunAgain} className={`${BTN_SECONDARY} mt-3`}>
                Run setup again
              </button>
            )}
          </Notice>
        ) : (
          kind && <p className="m-0 text-sm text-pretty text-[var(--tx)]">{kind.means}</p>
        )}
        <dl className="m-0 flex flex-col gap-1 text-xs">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-[var(--tx2)]">Boot contract</dt>
            <dd className="m-0 text-[var(--tx)]">{kind ? kind.contract : "Not checked yet"}</dd>
          </div>
          {reachedBy && whose && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[var(--tx2)]">Reached through</dt>
              <dd className="m-0 text-[var(--tx)]">
                {whose[0].toUpperCase() + whose.slice(1)} access, with the {VIA[repo.reachedBy?.via ?? "app"]}
              </dd>
            </div>
          )}
        </dl>
        <ol aria-label={`Setup steps for ${repo.name}`} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {SETUP_STEPS.map((s) => {
            const { state: stepState, detail } = steps[s.id];
            const quiet = stepState === "waiting" || stepState === "skipped";
            return (
              <li key={s.id} className="flex items-start gap-2">
                <span title={STEP_STATES[stepState]} className="flex h-5 w-4 flex-none items-center justify-center">
                  <StepMark state={stepState} />
                </span>
                <span className="min-w-0 flex-1 text-sm text-pretty">
                  <span className={quiet ? "text-[var(--tx2)]" : "text-[var(--tx)]"}>{s.name}</span>
                  <span className="sr-only">: {STEP_STATES[stepState]}.</span>
                  {detail && <span className={`ml-2 text-xs ${stepState === "failed" ? "text-danger-ink" : "text-[var(--tx2)]"}`}>{detail}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        {SETUP_STEPS.some((s) => steps[s.id].state === "skipped") && (
          <p className="m-0 text-xs text-[var(--tx2)]">A dash marks a step that a code-only repository doesn't need.</p>
        )}
      </div>
    </li>
  );
}
