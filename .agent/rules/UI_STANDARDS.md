# UI Standards: Modals and Overlays

## Core Principle
All modal windows, dialogs, and overlays in the Slovko project must follow the **Modern Glassmorphism** design language. This ensures visual consistency and a high-quality user experience.

## Modal Windows
- **Component:** Always use `src/lib/components/ui/BaseModal.svelte`.
- **Do NOT** implement custom backdrops, blur effects, or close buttons inside specific modals.
- **Styling:** 
  - Backdrop: `rgba(0, 0, 0, 0.4)` with `backdrop-filter: blur(12px)`.
  - Content: Semi-transparent backgrounds, no heavy borders, modern typography.
  - Animations: Use `fade` for backdrop and `scale` for the modal (integrated in `BaseModal`).

## Implementation Checklist
1. Import `BaseModal` from `$lib/components/ui/BaseModal.svelte`.
2. Wrap your modal content with `<BaseModal {onclose} testid="...">`.
3. Use the `maxWidth` prop to control window width (default is 480px).
4. Place main actions (like "Save" or "Start") in a dedicated `.actions` div at the bottom.

## Example
```svelte
<script>
  import BaseModal from "../ui/BaseModal.svelte";
  let { onclose } = $props();
</script>

<BaseModal {onclose} testid="my-new-modal">
  <div class="content">
    <!-- Your content here -->
  </div>
</BaseModal>
```
