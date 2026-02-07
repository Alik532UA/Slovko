<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ShieldAlert } from "lucide-svelte";
	import { authStore } from "../../firebase/authStore.svelte";

	interface Props {
		isLinking: boolean;
		onlogin: () => void;
	}

	let { isLinking, onlogin }: Props = $props();
</script>

<div class="warning-box" data-testid="guest-warning-box">
	<ShieldAlert size={24} />
	<p>
		{authStore.isGuest
			? $_("profile.guestWarning")
			: $_("profile.tempAccountWarning")}
	</p>
</div>

<button
	class="login-btn"
	data-testid="profile-login-btn"
	onclick={onlogin}
	disabled={isLinking}
>
	{authStore.isGuest ? $_("profile.login") : $_("profile.linkAccount")}
</button>

<style>
	.warning-box {
		background: rgba(233, 84, 32, 0.1);
		border: 1px solid var(--accent);
		padding: 1rem;
		border-radius: 16px;
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.warning-box p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.4;
	}
	.warning-box :global(svg) {
		color: var(--accent);
		flex-shrink: 0;
	}

	.login-btn {
		width: 100%;
		background: white;
		color: #333;
		padding: 1rem;
		border-radius: 16px;
		font-weight: 700;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
		transition: transform 0.2s;
		margin-bottom: 2rem;
		border: none;
		cursor: pointer;
	}

	.login-btn:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
