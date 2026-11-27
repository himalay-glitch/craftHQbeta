---
# The live site's Docs, word for word (docs/CRAFTHQ_DOCS_SPEC.md §6). `title` is the name in the
# Articles list, `h1` the page's heading, `summary` the line on the Previous/Next cards, `order` the
# position. Below: the intro, then one `## ` heading per section; each section's link is made from
# its heading's words ("1. Before your first story" → #1-before-your-first-story).
title: "Use CraftHQ from Claude Code"
h1: "Use CraftHQ from Claude Code"
minutes: 6
summary: "Your own token, the crafthq CLI and its Claude Code plugin: set up in ten minutes."
order: 4
---

CraftHQ has a command-line tool, `crafthq`, and a plugin for Claude Code that comes with it. With them you can see what needs you, read a story, tell its assistant something, answer decisions, approve or move work and open the pull request, from your terminal, or by asking Claude in plain words. It signs in as **you**, so it shows and does exactly what you could do here in the browser, and nothing more.

Setting it up takes about ten minutes, once per computer.

## Who it is for

Anyone on a CraftHQ project who works in Claude Code or a terminal: business or engineering, member or admin. You do not need anybody's permission to start: every person creates their own token.

| You need | Check |
|---|---|
| A CraftHQ account you can sign in with here | you are reading this |
| **Claude Code** | `claude --version` |
| **Node.js 18 or newer** (the CLI and plugin are Node programs) | `node --version` |
| **cloudflared**: only if this instance sits behind Cloudflare Access (you see a Cloudflare sign-in page before CraftHQ's own). **app.crafthq.ai does not** once it is public: skip cloudflared there | `cloudflared --version` |

Install cloudflared on macOS with `brew install cloudflared`; on Linux use Cloudflare's package for your distribution. On Windows, use WSL; the CLI is tested on macOS and Linux.

## 1. Create your token

Open [Settings › Tokens](/settings?tab=tokens), give the token a name (the computer it is for: *laptop*, say) and press **Create token**. Copy the `chq_…` value straight away: it is shown **once**, and only its name and first letters stay visible afterwards.

- A token **lasts 90 days** from the day you create it, or until you revoke it. The Tokens tab shows the date each one ends; make a new one before then and run `crafthq login` again (step 3).
- Treat it like a password. Never paste it into a chat, a story note or a ticket.
- Make one per computer, so you can revoke one without touching the others.

Right under the new token, the Tokens tab repeats the next three steps with this instance's address already filled in.

## 2. Install the CLI and the plugin

Download the CLI from this instance. **Settings › Tokens** shows a *Download the CLI* link when the instance offers it. From a terminal you can fetch the same file with your token instead (`read -rs` keeps the token out of your shell history):

```sh
read -rs CRAFTHQ_TOKEN   # paste your chq_… token, then press Enter
printf 'Authorization: Bearer %s\n' "$CRAFTHQ_TOKEN" |
  cloudflared access curl https://app.crafthq.ai/api/v2/cli/bundle -H @- -o crafthq-cli.tgz
unset CRAFTHQ_TOKEN
```

The header goes in on standard input (`-H @-`), so the token is never on a command line where another program on the computer could read it.

(Not behind Cloudflare Access? Use plain `curl` with the same arguments. Given a service token instead [see step 3], add its two `CF-Access-Client-…` headers to plain `curl`.)

Then unpack it and run the install script inside. It puts `crafthq` on your PATH and adds the plugin to Claude Code:

```sh
mkdir -p ~/.crafthq/cli
tar -xzf crafthq-cli.tgz -C ~/.crafthq/cli
sh ~/.crafthq/cli/install.sh
```

Open a new terminal afterwards (and restart Claude Code if it was running), then check that `command -v crafthq` prints a path.

If there is no download link and the command answers *no CLI bundle on this instance*, this instance does not offer the CLI yet; ask whoever runs it.

## 3. Sign in

First, if this instance sits behind Cloudflare Access, sign in to Cloudflare as yourself. A browser opens; use the same login you use for this website. (No Cloudflare sign-in page before CraftHQ's own, app.crafthq.ai once it is public? Skip this, and use `--access none` below.)

```sh
cloudflared access login https://app.crafthq.ai
```

Then sign the CLI in. `--instance` is a short name you choose for this CraftHQ (it is how you pick it if you ever use more than one). The CLI asks for your token at a hidden prompt, checks it with CraftHQ and saves it only on your computer, readable only by you.

```sh
crafthq login --instance app --url https://app.crafthq.ai --access cloudflared
```

How the CLI gets past Cloudflare Access is the `--access` option:

| `--access` | When |
|---|---|
| `cloudflared` | the usual case: this instance sits behind Cloudflare Access and lets you in as yourself (the `cloudflared access login` above) |
| `service-token --access-env FILE` | whoever runs the instance gave you an Access **service token** instead. Put its two lines (`CF_ACCESS_CLIENT_ID=…`, `CF_ACCESS_CLIENT_SECRET=…`) in a file only you can read (`chmod 600 FILE`) and name that file; the CLI never stores the secret itself |
| `none` | not behind Cloudflare Access (app.crafthq.ai once it is public); also clears an access saved by an earlier login |

`crafthq setup login --url https://app.crafthq.ai` prints the exact login line for an instance.

## 4. First commands

```sh
crafthq whoami          # who you are, and your projects
crafthq inbox           # what needs you, and why
crafthq board --mine    # your stories: open · in progress · in review · blocked
crafthq story 102       # one story: spec, plan, last run, CI, preview, PR, whose turn
crafthq tell 102 "Use the 7-day window, not 30"   # a note the story's assistant reads
crafthq decide 41 B     # answer decision 41 with option B; final, like in the browser
```

Story ids can be written `102` or `hq-102`. Add `--json` to any command for a script.

In Claude Code you can type `/crafthq:inbox` or `/crafthq:story 102`, or just ask: *"what needs me in CraftHQ?"*, *"summarise hq-102's plan"*. Before anything that changes CraftHQ runs, Claude Code asks your permission (unless you have told it to allow that tool).

## 5. What you can do from Claude Code

Your role comes from your CraftHQ account; the CLI never adds to it.

| You are | From Claude Code and the CLI | Still in the browser |
|---|---|---|
| **Member** (business) | inbox, board, a story and its notes and files, tell, decide, approve · pause · re-run · move status, new and edit stories, attach files, promote and import intake, Create PR | previews, re-assigning a story, the Changes screen, Settings |
| **Member** (engineering) | the same; Create PR needs your GitHub connected first (Settings › GitHub) | the same |
| **Project admin** | the same as a member; the intake also shows colleagues' private imports, read only | People, Repositories, the project's tracker mapping |
| **Staff** (the people who run the instance) | the same, plus switching a project's loop features | everything under Admin |

Every member of a project may move, comment on and approve every story in it: one shared board. A project you are not in reads as "not found".

Whoever runs the instance can switch the CLI off for a project (Admin › the project › Loop features › *CLI and plugin*). Where it is off, every command but `whoami` and `features` refuses, and says so.

## 6. How long things last

| What | How long | When it ends |
|---|---|---|
| **Your token** | 90 days from when you create it | the date shown in Settings › Tokens, or earlier if you revoke it there or your account is disabled. Leaving a project only takes that project out of what it reaches |
| **Your Cloudflare sign-in** (instances behind Cloudflare Access) | as long as the instance's Access session (set by whoever runs it, often 7 to 30 days) | commands answer *blocked by Cloudflare Access*: run `cloudflared access login https://app.crafthq.ai` again |
| **Your sign-in on this website** | 30 days, renewed while you use it | sign in again |

## 7. Troubleshooting

| You see | What it means | Do this |
|---|---|---|
| `blocked by Cloudflare Access` | your Cloudflare sign-in is missing or has run out | `cloudflared access login https://app.crafthq.ai` |
| `CraftHQ rejected the token (401)` | the token is wrong, was revoked, or reached its 90 days | create a new one in Settings › Tokens, then `crafthq login --instance app` again |
| `… not found or not a member` | a wrong id, or a story outside your projects | check the id with `crafthq board` |
| `CraftHQ CLI tools are turned off for …` | the CLI is switched off for that project | ask whoever runs the instance; don't work around it |
| `work is under way on hq-…` | a build is running, so the status is locked | wait, or `crafthq tell` it |
| `no CLI bundle on this instance` | this instance offers no download | ask whoever runs it for the CLI |
| `crafthq: command not found` | the install did not reach this terminal's PATH | open a new terminal; if it persists, run `sh ~/.crafthq/cli/install.sh` again |
| `/crafthq:…` commands missing in Claude Code | Claude Code has not loaded the plugin yet | restart Claude Code; if they are still missing, run the install script again |
| `… passes Cloudflare Access with cloudflared, which is not installed` | cloudflared is missing | install it, then sign in (step 3) |

**Lost a computer?** Revoke its token in Settings › Tokens straight away. On a computer you still have, `crafthq logout` removes the token from it; revoke it here too.

## 8. What stays in the browser

Use the website for these:

- starting, stopping, extending or approving a **preview**;
- **re-assigning** a story, or choosing its owner when you create it;
- the **Changes** screen (the diff) and reading a spec or engineering page in full (the CLI shows an excerpt and a link);
- **Settings** (your Claude account, GitHub, issue tracker, profile and tokens) and, for admins, People and Repositories.

New to CraftHQ itself? Start with [Getting started](/docs/getting-started).
