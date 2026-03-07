<script lang="ts">
	import type { InteractionEvent } from "$lib/firebase/PresenceService.svelte";
	import { _ } from "svelte-i18n";
	import UserAvatar from "../friends/UserAvatar.svelte";
	import { slide, scale } from "svelte/transition";
	import {
		Hand,
		Check,
		TrendingUp,
		Trophy,
	} from "lucide-svelte";
	import { dev } from "$app/environment";
	import { onMount } from "svelte";
	import { getPluralForm } from "$lib/utils/pluralize";

	interface Props {
		event: InteractionEvent;
		onAction?: () => void;
		onRemove: (id: string) => void;
		onUpdateState: (
			id: string,
			state: "collapsed" | "expanded" | "sent",
		) => void;
		displayTimeOverrides?: Partial<Record<string, number>>;
	}

	let {
		event,
		onAction,
		onRemove,
		onUpdateState,
		displayTimeOverrides = {},
	}: Props = $props();
	let timer: NodeJS.Timeout;

	let isSystemEvent = $derived(event.uid === "local_system");

	async function handleActionClick(e: MouseEvent) {
		e.stopPropagation();

		if (onAction) {
			onAction();
		}

		if (!isSystemEvent) {
			onUpdateState(event.id, "sent");
		}

		// Закриваємо капсулу з затримкою або миттєво
		if (timer) clearTimeout(timer);

		let delay = isSystemEvent ? 0 : 2000;

		timer = setTimeout(() => {
			onRemove(event.id);
		}, delay);
	}

	function toggleExpand() {
		if (event.state === "collapsed") {
			onUpdateState(event.id, "expanded");
		} else if (
			event.state === "expanded" &&
			(event.type === "manual_menu" || event.type === "new_follower")
		) {
			onUpdateState(event.id, "collapsed");
		} else if (isSystemEvent) {
			handleActionClick(new MouseEvent("click"));
		}
	}

	onMount(() => {
		// Визначаємо час відображення на основі середовища та типу події
		let displayTime = dev ? 55000 : 5000; // 5с для продакшн

		const override = displayTimeOverrides?.[event.type];
		if (override !== undefined) {
			displayTime = override;
		}

		const id = event.id; // Фіксуємо ID для замикання

		timer = setTimeout(() => {
			onRemove(id);
		}, displayTime);

		return () => {
			if (timer) clearTimeout(timer);
		};
	});

	const statusText = $derived(() => {
		if (event.type === "daily_goal_reached") {
			const streak = event.streak || 0;
			const dayWord = getPluralForm(
				streak,
				$_("profile.stats.day"),
				$_("profile.stats.daysGenitive"),
				$_("profile.stats.days"),
			);
			return `${streak} ${dayWord} ${$_("profile.stats.inARow")}`;
		}
		if (event.type === "leader_gap_reached") {
			return `До першого місця в топі залишилось: ${event.gap || 0}`;
		}
		if (event.type === "leader_overtaken") {
			return "Вітаю! З першим місцем у рейтингу!";
		}
		if (event.state === "sent") {
			return event.type === "new_follower"
				? $_("interaction.youFollowed")
				: $_("interaction.youWaved");
		}
		if (event.type === "incoming_wave") return $_("interaction.wavingAtYou");
		if (event.type === "new_follower") return $_("interaction.followedYou");
		if (event.type === "online") return $_("interaction.onlineNow");
		
		return $_("interaction.wave");
	});
</script>

<div
	class="capsule-container"
	class:expanded={event.state !== "collapsed"}
	class:sent={event.state === "sent"}
	class:success={isSystemEvent}
	transition:scale={{ duration: 200, start: 0.8 }}
	data-testid="interaction-capsule-{event.type}"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="interactive-area"
		onclick={toggleExpand}
		data-testid="interaction-trigger-{event.uid}"
	>
		{#if event.state !== "collapsed"}
			<div
				class="content-panel"
				transition:slide={{ axis: "x", duration: 250 }}
				data-testid="interaction-content-panel"
			>
				<div class="text-block" data-testid="interaction-text-block">
					<span class="nickname" data-testid="interaction-nickname">
						{#if event.type === "daily_goal_reached"}
							+1 {$_("profile.stats.day")}
						{:else if event.type === "leader_gap_reached"}
							Наздоганяємо лідера!
						{:else if event.type === "leader_overtaken"}
							Новий рекорд!
						{:else}
							{event.profile.name}
						{/if}
					</span>
					<span class="status-text" data-testid="interaction-status-text">
						{statusText()}
					</span>
				</div>

				{#if event.state === "sent"}
					<div
						class="sent-indicator"
						transition:scale
						data-testid="interaction-sent-indicator"
					>
						<Check size={18} data-testid="icon-check-sent" />
					</div>
				{:else if !isSystemEvent}
					<button
						class="wave-btn"
						onclick={handleActionClick}
						aria-label={event.type === "new_follower"
							? $_("interaction.followBack")
							: (event.type === "incoming_wave" ? $_("interaction.waveBack") : $_("interaction.wave"))}
						data-testid="interaction-action-btn"
					>
						<Hand size={18} data-testid="icon-hand-wave" />
					</button>
				{/if}
			</div>
		{/if}

		<div class="avatar-anchor" data-testid="interaction-avatar-container">
			{#if event.type === "daily_goal_reached" || event.type === "leader_gap_reached"}
				<div
					class="success-icon-wrapper"
					transition:scale
					data-testid="interaction-status-icon-box"
				>
					<TrendingUp
						size={24}
						strokeWidth={2.5}
						data-testid="icon-trending-up"
					/>
				</div>
			{:else if event.type === "leader_overtaken"}
				<div
					class="success-icon-wrapper winner"
					transition:scale
					data-testid="interaction-status-icon-box-winner"
				>
					<Trophy
						size={24}
						strokeWidth={2.5}
						data-testid="icon-trophy-winner"
					/>
				</div>
			{:else}
				<div style="pointer-events: none; display: flex;">
					<UserAvatar
						uid={event.uid}
						photoURL={event.profile.photoURL}
						size={40}
						interactive={false}
						showStatus={event.type === "online" || event.state === "collapsed"}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.capsule-container {
		display: flex;
		justify-content: flex-end;
		pointer-events: auto;
	}

	.interactive-area {
		display: flex;
		align-items: center;
		flex-direction: row; /* Текст зліва, аватар справа */
		background: rgba(30, 30, 46, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 4px;
		cursor: pointer;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		max-width: fit-content;
	}

	.success .interactive-area {
		background: rgba(16, 44, 31, 0.95);
		border-color: rgba(46, 204, 113, 0.4);
		box-shadow: 0 8px 20px rgba(46, 204, 113, 0.1);
	}

	.success-icon-wrapper {
		width: 40px;
		height: 40px;
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.success-icon-wrapper.winner {
		background: rgba(241, 196, 15, 0.2);
		color: #f1c40f;
	}

	/* У згорнутому стані робимо фон мінімальним або взагалі прибираємо рамку */
	.capsule-container:not(.expanded) .interactive-area {
		background: transparent;
		border-color: transparent;
		box-shadow: none;
		padding: 0;
	}

	.avatar-anchor {
		flex-shrink: 0;
		z-index: 2;
	}

	.content-panel {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 12px 0 16px;
	}

	.text-block {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.nickname {
		font-weight: 700;
		font-size: 0.85rem;
		color: white;
		white-space: nowrap;
	}

	.status-text {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.6);
		white-space: nowrap;
	}

	.wave-btn {
		background: var(--accent, #3a8fd6);
		color: white;
		border: none;
		border-radius: 50%;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.2s,
			background 0.2s;
		flex-shrink: 0;
	}

	.wave-btn:hover {
		transform: scale(1.1);
		background: #4a9fe6;
	}

	.wave-btn :global(svg) {
		animation: waving 2.5s infinite ease-in-out;
		transform-origin: bottom center;
	}

	@keyframes waving {
		0%, 100% { transform: rotate(0deg); }
		15% { transform: rotate(-15deg); }
		30% { transform: rotate(12deg); }
		45% { transform: rotate(-10deg); }
		60% { transform: rotate(7deg); }
		75% { transform: rotate(0deg); }
	}

	.sent-indicator {
		color: #2ecc71;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sent .interactive-area {
		border-color: rgba(46, 204, 113, 0.5);
	}
</style>
