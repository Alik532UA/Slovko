<script lang="ts">
	import { networkStore } from "$lib/stores/network.svelte";
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
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		pointer-events: none;
		transition: color 0.3s ease;
	}

	.online {
		color: #22c55e; /* green-500 */
	}

	.offline {
		color: #ef4444; /* red-500 */
	}

	/* Темна тема, якщо підтримується */
	@media (prefers-color-scheme: dark) {
		.network-indicator {
			background: rgba(31, 41, 55, 0.9); /* gray-800 */
		}
	}
</style>
