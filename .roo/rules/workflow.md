## 2. CONTEXT GATHERING (THINK BEFORE YOU ACT)
Before writing or modifying any code, you must build your context. Do not guess.
1.  **Search First:** Use `rg` to find where a component, function, or class is imported and used across the entire project.
2.  **Read the Rules:** Always check if there are specific domain rules in the `.roo/rules/` directory that apply to the current task (e.g., OOP standards, native module rules).
3.  **Read the Code:** Read the actual file contents using the `read_file` tool to understand the surrounding logic and imports.

## 3. WORKFLOW & COMMAND EXECUTION
* **Plan Validation:** Before executing complex refactoring or multi-file changes, briefly state your plan and the files you intend to modify.
* **Terminal Commands:** Assume a zsh/macOS terminal. Keep commands clean and chain them logically if needed.
* **Incremental Changes:** If a task is massive, break it down. Apply changes file by file and ensure there are no syntax errors before moving to the next.
* **Auto-Approve Synergy:** You are trusted with read-only operations (`rg`, `fd`, `cat`, `ls`). Use them heavily to explore. For file modifications, provide clear, precise diffs.

## 8. STOPPING CONDITIONS
* If you have found the relevant class/function and understand its contract, stop exploring.
* Do not read parent classes, sibling files, or barrel index files unless directly needed.
* If `rg --files-with-matches` returns more than 10 files, narrow the query before reading any.