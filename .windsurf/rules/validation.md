---
trigger: model_decision
---
# MANDATORY: Post-Edit Validation

After EVERY code edit, you MUST run:
1. `pnpm biome check --write`
2. `pnpm eslint --fix .`

If either command reports errors, fix them immediately.
NEVER end your response without having run both commands.
This is non-negotiable.