---
title: Coordinating agents across different subscriptions
date: 2026-11-17
description: I split my coding work across Claude, Codex and Gemini. Coordinating them through a shared file ate the tokens I was trying to save, so I moved it into a small MCP server.
draft: false
---

> **The MCP server in this post:** [agent-team-up](https://github.com/firstprateek/agent-team-up)

To experiment and compare, I got the cheapest plan for Claude, Gemini and Codex. On the lower tiers the tokens run out pretty fast, especially if you use anything better than the smallest model.

Through experimenting, I've found that for my use cases each model has its own strengths. Claude is good at coming up with plans and is a good writer. Gemini gives nice, organized explanations and is good at writing code, even with the smaller models, when given clear instructions. Codex feels faster and better at computer use.

This got me thinking about how I could coordinate work among all three, use each one for its strengths, and spread my tokens across the subscriptions more efficiently.

My first solution was a simple markdown file in the repo I was working on, with goals, a task table and a "live" log at the end. Each agent would pull, read the file, claim a task, push, and check back five minutes later. It worked better than I expected, and I used it for about a week on one project.

However, it got expensive in a way I didn't notice at first. The file grew to 640 lines and 267 commits, and every agent read the whole thing on every check-in, even when nothing had changed. I had split the work up to save tokens, and the coordination was eating them. Every claim and status change was another commit to push and pull, and nothing stopped two agents from claiming the same task at once. When one left a question for me, it sat in the log until I scrolled past it.

So for my improved solution, I moved the coordination into a small MCP server where an agent only reads what's new for it, without polling the repo. Agents claim tasks through the server, so two can't take the same one. When an agent runs out of work it calls `wait`, which returns as soon as a new task, handoff or message arrives, or after about 45 seconds with nothing, and the agent calls it again. I post goals and answer questions on a board I keep open on my phone, and replying there wakes the waiting agent too.

The server uses HTTP instead of stdio because the agents aren't on the same machine. I run Claude on a desktop machine at home, while Codex and Antigravity run on my laptop and connect to it over Tailscale.

Give the MCP server a try, and feel free to send me any feedback [here](/contact/).
