---
title: Getting git out of my agents' way
date: 2026-11-17
description: A small skill that lets coding agents ship on their own, and asks me only about the parts that matter.
draft: false
---

> **The skill:** [agent-git-workflow](https://github.com/firstprateek/agent-git-workflow). In Claude Code:
> `/plugin install agent-git-workflow --marketplace firstprateek/agent-git-workflow`

I read Anthropic's post on
[harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
and kept thinking about my much smaller setup: one GitHub account, mostly simple projects with a repo,
GitHub Actions and GitHub Pages. The agents could write the code, but every PR still waited for me.
Usually I opened it, saw green checks, and clicked merge. That was my contribution.

I wanted them to keep going. I kept coming back to four things they needed.

First, they needed to know what I wanted. I could write that down in an `AGENTS.md` with the commands
and conventions, plus a short decision record for choices I didn't want to keep reopening. Otherwise,
they'd keep stopping to ask what I meant.

They also needed a way to check their work: one command, the same locally and in CI, with evidence in
the PR. Screenshots when useful, or a transcript or test output. Then a second agent would review the
diff with fresh context, without the first agent's reasoning to lean on. I don't trust an agent to
grade its own work, and a fresh reviewer is cheap.

Mistakes had to be cheap too. Every change gets a branch and a PR. Checks have to pass before `main`
moves, and I can revert a bad merge. That makes it easier to let a change through without approving
it myself.

The harder question was when they should interrupt me. I think of the codebase as a tree. Changes near
the leaves, say a button or one feature's internals, can merge on their own. Changes near the root,
like the data model, a public interface or CI, wait for me. But I read a one-page spec, not the diff,
and by then another agent has already reviewed both. The spec covers what changes and why, the
alternatives, and how to undo it. Reviewing that decision is a better use of my time than reviewing
the code.

I choose what counts as root for each repo. For many of my experiments, nothing is core. Everything
can merge after checks and review. I step in when I ask to.

For the remaining decisions, the agent makes reversible choices and notes them in the PR. Otherwise,
it asks me a question with options, a recommendation and a default, then works on something else
while it waits.

I packaged this as a skill for my setup. It works with any language and any agent that reads the
[Agent Skills](https://agentskills.io) format. On the first trial, with my solar-system app, it caught
three real bugs in the gate itself before anything merged.

Try it, and tell me where it gets in your way.
