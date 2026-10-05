# Bloc-notes / Scratchpad

A small editable notepad with automatic saving, a character counter, custom heading, and optional monospace text. Inherits DashDock's theme and French/English language. No dependencies, network integrations, or additional permissions.

Changes save after 800 ms of inactivity, when the editor loses focus, or with Ctrl+S / Cmd+S. Save failures keep the draft in the current widget and offer Retry; closing the widget before a successful save can lose that draft. The store preview never persists changes.

Copy selects the text and tries the browser's copy command. If sandbox restrictions prevent automatic copying, use Ctrl+C / Cmd+C on the selected text. Downloads and clipboard permissions are not required.

Storage uses `config.get` / `config.save`. Text is split at Unicode character boundaries into UTF-8 segments of at most 1800 bytes, below DashDock's 2000-byte per-string limit. The text budget is 6000 UTF-8 bytes and the serialized configuration stays below 7800 bytes (backend limit: 8192). Escaped control characters may reach the configuration limit sooner.

Run `node tests/scratchpad.cjs` from the repository root to check saving, concurrent edits, retry, preview isolation and Unicode limits.
