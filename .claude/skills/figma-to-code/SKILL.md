---
name: figma-to-code
description: Implement a Figma frame, page or flow in this Angular app, covering tokens, shared primitives, data model, mock data, store, components and tests. Use when the user shares a Figma link, frame or screenshot and wants it built.
argument-hint: <figma-url-or-description>
---

# Figma → Angular

Target: $ARGUMENTS

## 1. Get the design

- If Figma MCP tools are available, fetch the design context, variables, screenshots and assets for the target frame(s).
- If not, ask the user to either connect the Figma connector (claude.ai → Settings → Connectors → Figma, then `/mcp` in Claude Code) or paste screenshots and exports of the frames. Don't guess layouts from a URL alone.

## 2. Plan

Delegate to the **feature-planner** agent with the design details. Show the user the plan summary and its open questions. On a first pass or for large screens, wait for confirmation. For small, clear screens, proceed.

## 3. Build, in this order

1. **Tokens**: sync new colors, type, spacing, radii and shadows from Figma variables into `src/styles/_tokens.scss`, then global font imports if needed.
2. **Shared primitives**: create or extend `src/app/shared/ui/*` (delegate to **ui-designer** for heavy UI work).
3. **Data**: models, then fixtures, then the abstract API with its `Mock…Api`, registered in `app.config.ts`.
4. **Store**: the feature `signalStore`.
5. **Components**: presentational first, then the page/smart component, then the route.
6. **Tests**: delegate to **test-writer** for store and component specs.

## 4. Verify

- `npm run check` passes (the Stop hook also enforces this).
- Run **angular-reviewer** on the change, and fix Must/Should findings.
- Offer to run `npm start` so the user can compare against Figma at mobile and desktop widths.

## 5. Report

Summarise briefly: screens built, new tokens and primitives, deviations from Figma, open questions.
