---
title: Vastu
date: 2026-11-15
status: active
summary: A small design system of Lit web components built for AI agents to use and check their own work, with one machine-readable contract behind the docs, the agent tools and the tests.
repo: https://github.com/firstprateek/vastu
---

[Docs and live examples](https://firstprateek.github.io/vastu/). Eight
components so far: button, checkbox, switch, text field, tabs, dialog, menu and
toast, in two brands with light, dark and high-contrast modes.

## One contract, written once

Every promise a component makes (its API, keyboard behaviour, theming hooks,
accessibility notes and usage guidance) lives in one machine-readable manifest.
The docs, the agent tools and the tests are all generated from it, and the tests
fail when the code stops matching it: an undocumented public method or a broken
theming hook is a failed build, not a surprise for whoever uses it next.

## Built for agents

Agents get three ways in: `llms.txt` with every component and token, an MCP
server with tools to find components, read their contracts and validate markup,
and a markup validator they can run on their own output. That last part matters
most: an agent that can check its work does not need a person to catch its
mistakes.

## Tested by agents

The eval has Claude Code build twelve pages with Vastu and checks each one for
the task, accessibility and correct token use. The first run passed 2 of 12
with the docs alone and 10 of 12 with the MCP tools. Reading every failure by
hand turned up three real Vastu defects and a gap in the docs that more than a
thousand component tests had missed. After the fixes, both setups passed 12 of
12.

## Built with

Lit, design tokens in the DTCG format, Astro for the docs, and Playwright with
axe-core. Every change runs contract, behaviour, accessibility, visual and
security checks in Chromium, Firefox and WebKit under a strict Content
Security Policy, with size budgets of about 2 kB per component on top of Lit.
