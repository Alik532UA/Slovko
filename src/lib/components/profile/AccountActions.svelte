<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Key, LogOut, Trash2 } from "lucide-svelte";

	interface Props {
		onchangePassword: () => void;
		onlogout: () => void;
		ondeleteAccount: () => void;
	}

	let { onchangePassword, onlogout, ondeleteAccount }: Props = $props();
</script>

<div class="account-actions" data-testid="account-actions-container">
	<button
		class="action-btn"
		data-testid="profile-change-password-btn"
		onclick={onchangePassword}
	>
		<Key size={20} />
		{$_("profile.changePasswordTitle")}
	</button>

	<button
		class="action-btn"
		data-testid="profile-logout-btn"
		onclick={onlogout}
	>
		<LogOut size={20} />
		{$_("profile.logout")}
	</button>

	<button
		class="action-btn danger"
		data-testid="profile-delete-account-btn"
		onclick={ondeleteAccount}
	>
		<Trash2 size={20} />
		{$_("profile.deleteAccount")}
	</button>
</div>

<style>
	.account-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 12px;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: var(--bg-secondary);
	}

	.action-btn.danger {
		color: var(--toast-error, #ef4444);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.action-btn.danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}
</style>
