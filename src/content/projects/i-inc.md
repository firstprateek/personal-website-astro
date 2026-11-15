---
title: i.inc
date: 2026-09-27
status: active
summary: A personal company of AI engineers. I file tickets; agent employees in walled sandboxes hand back work that is checked, reviewed by a different model, and proven.
repo: https://github.com/firstprateek/i-inc
---

Coding agents are good at a single task. They are bad at being trusted with a
repository while nobody is watching. Most of what it takes to trust one has
little to do with the model: isolation, review, proof that the work is done,
recovery when CI goes red, and memory that carries from one task to the next.
i.inc is my attempt at all of that, and I use it every day.

## How a ticket moves

An employee picks up a ticket on a fresh branch, plans, builds, and runs the
project's own checks, with a few fix attempts before it switches engines. A
separate verifier then checks every "done when" item. Review happens with fresh
eyes, on a different vendor's model where one is available, for at most two
rounds; anything still disputed goes into the report instead of looping forever.

Then the host, not the agent, pushes exactly the commit that was checked. If CI
on `main` goes red, the same ticket becomes the fix, and if it is still red two
hours later the push is reverted.

## Three decisions

**The team is the trust boundary.** Agents need root to do ordinary work, so a
Unix user per employee would isolate nothing. Each team gets one sandbox, the
sandboxes cannot reach each other, and the real wall is at GitHub.

**Agents never push.** Sandboxes get a read-only token. A GitHub App holds the
only write access, so a secret like a release signing key stays out of an
agent's reach because GitHub enforces it, not because the agent behaves.

**Review on a different engine.** A model reviewing its own diff mostly agrees
with itself. Swapping engines is only possible because every engine plugs in
through the same protocol.

## Protocols

Every engine (Claude Code, Codex, Antigravity, or a local model through
OpenCode) is an **ACP** agent, so an employee keeps its identity and memory
when it moves to another vendor. The live side runs on Microsoft's **Agent Host
Protocol**: I can open any session from my phone, answer a permission card, or
replay what an agent did at each stage. **MCP** tools are the next step. I did
trust and lifecycle first, because reach was never the bottleneck.

## Where it stands

About 150k lines of TypeScript (a Bun daemon, a Lit web app and a pure core),
117 pull requests in its first six weeks. Since a redesign in October the agents
have written some of their own commits and filed their own follow-up tickets.
