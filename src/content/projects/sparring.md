---
title: Sparring
date: 2026-11-10
status: active
summary: A writing coach that interviews me and critiques in the margin, built so the AI cannot edit my article. The protocol enforces that, not the prompt.
repo: https://github.com/firstprateek/sparring
featured: false
---

Language models make good editors and poor writers. Most AI writing tools blur
the two. In Sparring I write every sentence by default: the coach asks
questions, leaves notes anchored to exact spans of my text, and runs named
critique passes, but it has no tool that can change the page. The writing on
this site starts there.

## Making "never write" a guarantee

A rule in a prompt can be argued around, so the guarantee lives in the
plumbing. The coach is a stock Claude agent over **ACP** with every built-in
tool removed. Its only tools are six Sparring tools served over **MCP**, and the
daemon validates each call: a note's anchor must be an exact substring of the
article, and a quote must be something I actually wrote. A permission policy
allows only those tools, and a tripwire hashes the article around every turn
and sets aside any change it cannot explain.

Before building any of it, I wrote a probe against the pinned agent version and
checked that, when asked to append to the article, it made no call outside
Sparring's tools and the file did not change.

There is one explicit, logged exception, "send it", where the coach writes a
first draft. The page then marks every block that is still its words and says
how much of the text is mine.

## Articles are files in git

Articles are plain Markdown in a git repository, so I can also write in any
editor. Every coach turn starts with a commit. That one choice paid for itself
four times: the tripwire restores from it, the draft shelf restores the old page
byte for byte, publishing ships an exact reviewed commit as a pull request to
this site, and backup is a `git push`.

## Shape

One Bun daemon, a web app that works on a phone, and a Tauri desktop shell.
Clients talk to the daemon over the **Agent Host Protocol**, which I lifted from
[i.inc](/projects/i-inc/). Around 23k lines of TypeScript and 449 tests, all run
against a scripted coach so they are deterministic and spend no tokens.
