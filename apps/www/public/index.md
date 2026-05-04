# CodeSesh

CodeSesh turns local AI coding history into reusable engineering memory.

It discovers local sessions from Claude Code, Cursor, Kimi, Codex, and OpenCode, then preserves problems, reasoning, attempts, file changes, and outcomes in one searchable memory layer.

## Start

```bash
npx codesesh
```

CodeSesh runs locally and opens a Web UI at `http://localhost:4321`.

## Product Tour

### Engineering Memory Overview

See collaboration patterns through agent activity, token trends, smart tags, and bookmarked sessions.

### Full-Text Search

Search titles and message content to return to the right engineering context.

### Session Replay

Replay messages, tool calls, and file changes in the order a feature or bug fix unfolded.

### Keyboard Navigation

Move through projects, sessions, and results efficiently so browsing history fits daily work.

## Features

### Discover

CodeSesh brings local sessions from different agents into one index.

- Zero Configuration: run one command and scan supported agent sessions on your filesystem.
- Live Refresh: local session changes appear automatically as new collaboration records are written.
- Unified Timeline: browse Claude Code, Cursor, Kimi, Codex, and OpenCode sessions in one interface.

### Organize

CodeSesh puts sessions back into project, task, and engineering context.

- Engineering Memory Overview: see cross-agent activity, models, tokens, smart tags, and bookmarked sessions together.
- Project-Aware Session Tree: group sessions by repository and project identity across supported agents.
- Smart Tags: label bugfix, refactor, feature, testing, docs, planning, Git, build, and exploration work.

### Recover

CodeSesh brings old decisions, paths, and context back into the current task.

- Full-Text Search: search titles and conversation content with highlighted matches.
- Session Bookmarks: save important records so solutions, debugging paths, and key decisions stay traceable.
- Keyboard Navigation: move across views, focus search, and navigate groups from the keyboard.

### Replay

CodeSesh reconstructs the full path from problem to result.

- Full Conversation Replay: read every message, tool call, and reasoning step in sequence.
- File Change Tracking: jump to files that were read, edited, created, deleted, or moved.
- Cost and Token Visibility: see token totals, cache tokens, recorded costs, and model-based estimates.
- SQLite Local Index: use one local database for fast session restore and full-text indexing.
- Local and Private: session data stays on your machine.

## Supported Agents

- Claude Code
- Cursor
- Kimi
- Codex
- OpenCode

## Links

- Product site: https://codesesh.xingkaixin.me/
- AI overview: https://codesesh.xingkaixin.me/llms.txt
- Full AI knowledge file: https://codesesh.xingkaixin.me/llms-full.txt
- GitHub: https://github.com/xingkaixin/codesesh
- npm: https://www.npmjs.com/package/codesesh

## 中文说明

CodeSesh 是一个本地开发者工具，用来发现、聚合、搜索和回放 Claude Code、Cursor、Kimi、Codex、OpenCode 的本地 AI 编码历史，把分散的协作记录沉淀成可复用的工程记忆。
