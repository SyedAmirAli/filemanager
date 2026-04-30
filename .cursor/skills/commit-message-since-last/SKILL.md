---
name: commit
description: >-
    Drafts a git commit message from uncommitted changes. Triggers when user 
    asks for a commit message or uses /commit. Automatically inspects git diff 
    and status without asking permission.
---

# Commit

**Skill name:** `commit` â€” generates **git commit messages** from uncommitted changes.

## When to apply

- User asks for a commit message, types `/commit`, or wants to commit their work.
- User mentions "git commit" or "what should I commit with".

## Steps

1. **Silently inspect changes** (no narration, no asking permission):

```bash
    git status
    git diff
    git diff --staged
```

2. **Analyze** what changed â€” features added, bugs fixed, refactoring done.

3. **Generate** a Conventional Commitsâ€“style message:
    - **Subject line**: `type(scope): short summary` (50-72 chars, describe the overall change)
    - **Body**: 3-5 concise bullet points explaining specific changes
    - Each bullet should be one clear sentence
    - Use present tense, imperative mood ("Add feature" not "Added feature")
    - Be specific but brief â€” focus on WHAT changed, not HOW

4. **Output format**:
    - Put the final commit message in a single fenced code block (```text)
    - NO shell commands in the block
    - NO preamble before the code block
    - User should be able to copy-paste directly

## Example output

```text
feat(docs): improve PDF export UX and homepage actions

- Add homepage hero CTAs for Getting Started plus English/French PDF downloads.
- Integrate PDF export tooling and scripts with language-specific config files.
- Add PDF export button in the VitePress navbar and print-focused style adjustments.
- Improve print output by handling video links and footer/header rendering.
- Set PDF URL origin to https://docs.admin.acusolo.net to replace localhost links.
```

## Message style guidelines

- **Subject**: summarize the main theme, not every single file
- **Bullets**: each bullet = one logical change or feature
- **Length**: 3-5 bullets preferred (can be 2-6 depending on scope)
- **Tone**: professional, factual, no filler words
- **Format**: sentence case with periods at the end, not include serial like `1. - Add Home ...` instead `- Add Home`

## Critical rules

- NEVER ask "Should I inspect the changes?" â€” just do it
- NEVER put git commands in the final code block
- NEVER explain what you're about to do â€” just run the commands and generate the message
- NEVER output a one-line commit â€” always include bulleted details
- The message should make sense to someone reading the git log 6 months later
