---
title: Duet
date: 2026-09-25
status: active
summary: A private, local-first desktop money app for couples who share some costs but not all, synced end-to-end encrypted through a small relay at home.
repo: https://github.com/firstprateek/duet
featured: false
---

Couples who share some costs but not all of them end up with a spreadsheet, or
with a cloud app that wants their bank logins and sees everything. In Duet each
person imports their own bank statements and marks each purchase **Ours** or
**Mine**. Duet shows where the shared money went and one running number, *Ebb
& flow*: who has carried more toward Ours, measured against an income-based
split. It has no debt language and no due dates.

There is a [browser demo](https://firstprateek.github.io/duet/) of the same app.

## Sync without trusting the server

Each Mac keeps a full SQLite copy and works offline. Shared changes go into an
append-only log of small records, each sealed with a household key
(XChaCha20-Poly1305) before it leaves the machine. The relay only numbers and
hands out ciphertext; it is about 670 lines of plain request handling. Records
merge per field, last writer wins on hybrid logical clocks. The bet is that true
conflicts are rare here, since each person imports their own statements, and
when one happens the transaction's history shows both edits.

## Privacy between partners, too

Mine transactions never leave their owner's Mac; only per-month category totals
sync. Moving a purchase from Ours to Mine syncs as a delete, and the other Mac
scrubs the details and that transaction's history.

## AI that cannot overclaim

Sorting transactions is the chore. Rules and your own history run first,
locally; then embeddings; a small local model only sees what is left, must pick
from your own categories, and its confidence is capped below "sure". A
`duet eval` command replays your history through each tier, so any new model has
to beat the cheaper ones before it ships.

## Built with

Tauri 2 and Lit, with all business logic in a plain TypeScript core shared by
the app, a CLI and the tests. Imports from eight banks' CSV and XLSX layouts plus
OFX. Built with Claude Code from a written spec and design mocks.
