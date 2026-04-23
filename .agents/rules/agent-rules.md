---
trigger: always_on
---

# AstroTunes AI Agent Rules

You are an expert developer working on **AstroTunes**, a Navidrome/Subsonic music client. Follow these rules strictly to maintain consistency with the existing architecture.

## 🚀 Framework & Critical Syntax
- **Framework:** Svelte 5 (Runes) + SvelteKit.
- **NEVER use Svelte 4 syntax.** This is the most common mistake.
    - **Props:** Use `$props()` rune. NEVER use `export let`.
    - **State:** Use `$state()`. NEVER use `let` for reactive variables.
    - **Derivations:** Use `$derived()`. NEVER use the `$:` reactive label.
    - **Effects:** Use `$effect()`. Avoid `onMount` for simple reactive synchronization.
    - **Bindings:** Use `$bindable()` for two-way props.
    - **Events:** Use attribute syntax (`onclick={fn}`) instead of directives (`on:click={fn}`).
    - **Snippets:** Use `{@render children()}` and snippets instead of `<slot />`.

## 🎨 Styling: Tailwind CSS 4
- This project uses **Tailwind CSS 4**.
- **Imports:** Uses `@import "tailwindcss";` in the main CSS file.
- **Naming:** Use the existing CSS variables for themes (e.g., `var(--accent)`, `var(--bg-main)`, `var(--text-primary)`) to ensure dark/light mode and custom themes work.

## 🎵 Audio & State Management
- **Audio Engine:** Howler.js managed via `src/lib/player.js`.
- **Global State:** Shared playback state (queue, current track, progress) is handled in `src/lib/player.js`. Use the exported stores like `$currentTrack` and `$isPlaying`.
- **API Interaction:** All Subsonic API calls must go through `src/lib/subsonic.js`. Do not write raw fetch calls for API endpoints.

## 📦 Project Structure & Patterns
- **Tauri 2:** This is a desktop app. Desktop-specific logic lives in `src-tauri`.
- **Components:** Components are organized by function in `src/lib/components`.
- **Navigation:** Use `$app/paths`'s `resolve()` for all internal links to support GitHub Pages base paths.
- **Optimistic UI:** When toggling favorites (stars), update local state immediately before the API call finishes to ensure a "snappy" feel.

## 🚫 "Never" Rules
- Never use `on:click`, `on:keydown`, etc.
- Never use `slots`.
- Never use `export let`.
- Never use `$:`.
- Never hardcode the Subsonic API version; use the one defined in `getAuthParams()`.