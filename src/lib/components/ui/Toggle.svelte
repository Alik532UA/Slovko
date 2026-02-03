<script lang="ts">
    interface Props {
        checked: boolean;
        onchange?: (checked: boolean) => void;
        disabled?: boolean;
    }
    let { checked = $bindable(), onchange, disabled = false }: Props = $props();

    function toggle() {
        if (disabled) return;
        checked = !checked;
        onchange?.(checked);
    }
</script>

<button
    type="button"
    class="toggle-switch"
    class:checked
    class:disabled
    onclick={toggle}
    role="switch"
    aria-checked={checked}
    {disabled}
>
    <div class="thumb"></div>
</button>

<style>
    .toggle-switch {
        width: 44px;
        height: 24px;
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 999px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
        flex-shrink: 0;
    }

    .toggle-switch:hover:not(.disabled) {
        border-color: var(--text-secondary);
    }

    .toggle-switch.checked {
        background: var(--accent);
        border-color: var(--accent);
    }

    .thumb {
        width: 16px;
        height: 16px;
        background: var(--text-secondary);
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .toggle-switch.checked .thumb {
        transform: translateX(20px);
        background: white;
    }

    .toggle-switch.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
