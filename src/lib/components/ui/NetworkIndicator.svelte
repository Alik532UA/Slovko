<script lang="ts">
	import { networkStore } from "$lib/controllers/NetworkState.svelte";
	import { APP_ICONS } from "$lib/config/icons";
	import { fade } from "svelte/transition";

	// Використовуємо іконки з нашого конфігу
	const { Wifi, WifiOff } = APP_ICONS;
</script>

{#if networkStore.showIndicator}
	<div
		class="network-indicator"
		class:online={networkStore.indicatorType === 'online'}
		class:offline={networkStore.indicatorType === 'offline'}
		transition:fade={{ duration: 1000 }}
	>
		{#if networkStore.indicatorType === 'online'}
			<Wifi size={20} />
		{:else}
			<WifiOff size={20} />
		{/if}
	</div>
{/if}

<style>
	/*
	 * Кольори — з токенів теми, а не власні (UI-UX-v8 § 1.5).
	 *
	 * Доти цей індикатор був ЄДИНИМ місцем поза `app.css`, яке питало
	 * `@media (prefers-color-scheme: dark)`. Медіазапит міряє систему, а тему
	 * тут обирає користувач і зберігає `data-theme` — тобто це були різні
	 * джерела, і розходилися вони в обидва боки:
	 *
	 *   * світла ОС + тема `dark-gray` → біле коло на темній сторінці;
	 *   * темна ОС + тема `light-gray`/`green` → темно-сіре коло на світлій.
	 *
	 * Помітно це рівно тоді, коли зникає мережа, тобто в момент, коли на екран
	 * і дивляться. Теми `orange` і `green` не мали правильного варіанта взагалі:
	 * медіазапит про них не знає нічого.
	 *
	 * `--card-bg` замість власного напівпрозорого білого: індикатор лежить над
	 * тлом, яке в кожній темі своє, і напівпрозорість дала б у `orange` рожевий
	 * відтінок замість підкладки.
	 */
	.network-indicator {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-radius: 50%;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		box-shadow: var(--shadow-sm);
		pointer-events: none;
		transition: color 0.3s ease;
	}

	.online {
		color: var(--status-success);
	}

	.offline {
		color: var(--status-danger);
	}
</style>
