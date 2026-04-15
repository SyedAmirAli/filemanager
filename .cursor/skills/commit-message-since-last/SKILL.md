---
name: commit-message-since-last
description: >-
    Drafts a copy-paste conventional commit message from uncommitted git changes
    since the last commit. Use when the user asks for a commit message, a summary
    for committing, or wants a message derived from git diff, staged changes, or
    working tree changes.
---

# Commit message (since last commit)

## Workflow

1. **Inspect uncommitted changes since the last commit**
    - Run `git status`.
    - Run `git diff` for unstaged changes.
    - If there are staged files, run `git diff --staged` as well.
    - If the user cares only about what will be committed next, prefer **staged** diff (and note that in the summary if relevant).

2. **Write the message**
    - Use a **short** conventional-commit style **title** (e.g. `feat(scope): …`, `fix: …`).
    - Add **a few bullet lines** of detail: what changed and why.
    - Match this repository’s style: **complete sentences**, **no filler**, plain and precise.

3. **Deliver to the user**
    - Put the **final message only** in a **single fenced code block** so they can copy in one click.
    - Use a **plain text** fence: triple backticks with **no** language tag, or the tag `text`.
    - Do **not** wrap the suggested message in a language-tagged block (e.g. avoid ` ```markdown ` ) unless the message itself must show markdown as literal content.

## Do not

- Run `git commit` or commit automatically unless the user **explicitly** asks to commit.
