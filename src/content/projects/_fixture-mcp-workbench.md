---
title: MCP Workbench
date: 2026-08-04
status: active
summary: A local harness for developing and debugging Model Context Protocol servers, with a request inspector and a replayable transcript log.
repo: https://github.com/patjosh/mcp-workbench
video: _demo.mp4
featured: true
---

Writing an MCP server is easy. Debugging one is not, because the only client
you have is an agent that will happily paper over your bad tool descriptions
and then behave strangely three turns later for reasons that have nothing to do
with the code you just changed.

Workbench is the thing I wanted: a local client that speaks the protocol
honestly, shows every frame in both directions, and lets you replay a captured
session against a modified server.

## Why the inspector matters

Most MCP bugs are not protocol errors. They are description bugs — a tool whose
schema is technically valid and semantically misleading, so the model calls it
with plausible nonsense. You cannot see that in a stack trace. You can see it
immediately in a transcript where the arguments are printed next to the schema
that invited them.

```ts
server.tool('search_docs', {
  // The model reads this. It is the actual interface.
  description: 'Search the internal docs index. Returns at most 10 excerpts.',
  input: z.object({ query: z.string(), section: z.enum(SECTIONS).optional() }),
});
```

The `description` field is the part under test, and nothing in a normal
development loop puts it under test.

## Replay

Every session is written to a transcript that can be re-run. Change the server,
replay the transcript, diff the tool calls. It turns "did that help?" from a
judgement call into a diff, which is most of the reason the project exists —
see [the shortest loop wins](/writing/_fixture-short-loop/) for the argument.

Still moving quickly; the transcript format is not stable yet.
