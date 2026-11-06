---
title: "From one agent to a group of agents: how developers manage parallel coding agents"
description: The developer's problem has shifted from using one agent well to running several at once. Worktree isolation, who does the scheduling, when an orchestrator like Orca is worth it, and why review has become the new bottleneck.
date: 2026-11-06
topic: ai
tags:
  - agent
status: versioned
draft: false
---

> Product lists, features, and commands checked on 2026-11-06. This area changes every month; check the official docs before using any tool mentioned here.

When I wrote about the layers of the AI developer ecosystem in July (in Chinese), the question on my mind was how to make one CLI reliable: which model provider, how to set up the network and accounts. Four months later, those questions haven't gone away, but they are no longer the main one.

The question now is how to manage several at once: one agent on a feature while another fixes a bug, or two features moving in parallel, each handed to its own agent. This post covers only that developer-side layer. What shapes agents take as they multiply further, and how they talk to each other, is in [When agents multiply, they have to talk to each other](/en/blog/ai-tools/agents-need-to-talk/).

## One checkout can't hold two agents

The simplest case: you're halfway through a feature and a production bug comes in. You used to stash your changes and go fix it, or wait until the feature was done. Now one agent can keep working on the feature while another fixes the bug. The catch is that two agents can't edit files in the same working directory, or their changes will trample each other.

So the foundation of parallel agents is git worktree: several working directories checked out from the same repository, each on its own branch, sharing one commit history. One worktree per agent, changes isolated by construction, and each opens its own PR or merges when done.

## Who schedules the work: three levels

On top of worktrees, there are three ways to work, depending on how much the human manages.

**You are the dispatcher.** Open a worktree and a session per task, and switch between sessions yourself. In Claude Code, `claude --worktree <name>` creates the worktree and branch under `.claude/worktrees/<name>/`; start another in a second terminal and you have a second task. Codex is now part of ChatGPT, and its threads can likewise run locally, in their own worktree, or in the cloud.

**Hand it to the background and check back.** Once a task is dispatched you stop watching it, and it comes to you when it needs you. Claude Code's `claude agents` opens an overview (currently a research preview) showing what every background session is doing and which ones are waiting on you; a dispatched session moves itself into a worktree before it edits files. Codex cloud threads run on OpenAI's servers and keep going with your laptop shut.

**Let agents schedule agents.** The main session splits the work, hands it to subagents, and collects the results. Claude Code subagents can each run in their own worktree; `/batch` splits a large change across 5 to 30 subagents in parallel; agent teams let one lead session coordinate several others with a shared task list, which is still experimental and off by default.

I use the first two, both built into the CLIs. I haven't adopted a separate orchestration tool.

## Worktree pitfalls

A worktree is a fresh checkout, so gitignored things like `node_modules` and `.env` aren't there. Dependencies need reinstalling. Files like `.env` can be listed in Claude Code's `.worktreeinclude` (same syntax as `.gitignore`) and are copied into each new worktree automatically.

Think about the base branch. By default Claude Code branches new worktrees from the remote's default branch (usually `main`), which is right for a production bug fix. To continue on unpushed local work, set `worktree.baseRef` to `"head"`.

Don't count on fully automatic cleanup. When an interactive session exits, a worktree with changes asks whether to keep it. Worktrees created by `-p` runs aren't cleaned up automatically; remove them with `git worktree remove`, running `git worktree unlock` first if one is locked.

Agent teams don't give members their own worktrees, so several members edit files in the same directory. When you use them, divide ownership by file.

Finally, cost: several agents running at once means several times the tokens.

## Orca and friends: orchestration across vendors

The parallelism built into a CLI only manages that vendor's agents. If you use Claude Code, Codex, and other tools together, a new kind of tool comes in: desktop apps built to manage multiple coding agents.

[Orca](https://www.onorca.dev/) is one. It's open source (MIT) with macOS, Windows, and Linux builds. It gives each agent its own worktree and supports more than twenty CLI agents, including Claude Code, Codex, OpenCode, Grok, Gemini, Cursor, and Copilot, plus any command-line agent. The interface puts agents, terminals, a browser, and diffs side by side in split panes; you can comment on a diff and send it straight back to the agent, and a coordinator agent can direct worker agents. A mobile app notifies you when an agent is waiting for input and lets you reply from your phone.

Similar tools include [Conductor](https://www.conductor.build/), which is macOS only, and Vibe Kanban, now community-maintained after its company shut down in April 2026. For something lightweight in the terminal there's Claude Squad.

When is this layer worth it? I'd say in three cases: you mix agents from several vendors, you want one place to review all the diffs, or you need to respond to agents while away from your computer. If you use one vendor, the CLI's built-in features are enough. I haven't used this layer myself; the above is compiled from each project's documentation.

## After parallelism, the human's job is review

With several agents working at once, writing code is no longer the bottleneck; review is. Three agents in parallel means three diffs waiting for you. How much parallelism you can run depends on how much you can review, not how much the machine can run.

Keeping review up to speed comes down to old habits. Tasks should be independent and ideally not touch the same files. Each task should have a result that can be verified automatically; passing tests are more reliable than reading a diff. Keep tasks small, one thing per agent at a time.

One more thing becomes more important: the instruction file in the repository. Every worktree and every agent reads the same `AGENTS.md`. When the rules are written down clearly, the agents' output is consistent and review is easier. How to write one instruction file for several tools, and how to configure headless mode and permissions, is covered in my post on the AI coding workflow (in Chinese, [here](/blog/ai-tools/ai-coding-workflow/)). None of that changes with parallelism; the same rules just govern several agents at once.

## Not covered

I haven't used Orca, Conductor, or similar orchestration tools myself. Claude Code's agent teams are experimental and `claude agents` is a research preview, so behavior and commands may change.

The network and account layers (egress IP, DNS, account security) still matter; they're covered in the July post on the layers of the AI developer ecosystem (in Chinese), kept as a mid-2026 snapshot.

## References

- [Claude Code: ways to run agents in parallel](https://code.claude.com/docs/en/agents)
- [Claude Code: parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees)
- [Introducing the Codex app (OpenAI)](https://openai.com/index/introducing-the-codex-app/)
- [Orca](https://www.onorca.dev/)
- [The Code Agent Orchestra (Addy Osmani)](https://addyosmani.com/blog/code-agent-orchestra/)
