---
title: Toolcall Replay
date: 2025-11-30
status: experiment
summary: Records agent tool calls and replays them against a changed implementation, so you can tell whether a prompt edit actually helped.
repo: https://github.com/patjosh/toolcall-replay
video: _replay.mp4
featured: false
---

An experiment in making prompt changes falsifiable.

The workflow it replaces is depressing: change a system prompt, run the agent,
squint at the output, decide it seems better, ship it. Nothing about that is
measurement, and everyone doing it knows.

Replay captures tool calls from real sessions and re-runs them against a
modified prompt or implementation, then diffs the resulting call sequences.
Not a benchmark — the point is not a score, it is a diff you can read.

```
$ replay run --against prompts/v7.md fixtures/*.jsonl
  38 sessions, 214 tool calls
  changed: 11  (9 fewer redundant search_docs, 2 new file_read)
  regressed: 1  session-a4f now retries write_file 3x
```

That last line is the one that pays for the tool.

Parked while I work on [MCP Workbench](/projects/_fixture-mcp-workbench/),
which does a better job of the capture half. Some of this will fold into it.
The wider argument is in [the last mile of code review](/writing/_fixture-agents-review/).
