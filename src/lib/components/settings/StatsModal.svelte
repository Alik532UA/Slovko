<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Target, Trophy } from "lucide-svelte";
	import { navigationState } from "../../controllers/NavigationState.svelte";
	import { page } from "$app/stores";
	import { authStore } from "../../firebase/authStore.svelte";
	import { progressStore } from "../../stores/progressStore.svelte";

	// Sub-components
	import ProfileStats from "../profile/ProfileStats.svelte";
	import Leaderboard from "../profile/Leaderboard.svelte";
	import ProfileHeader from "../profile/ProfileHeader.svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import BaseModal from "../ui/BaseModal.svelte";
	import SegmentedControl from "../ui/SegmentedControl.svelte";
	import { smoothHeight } from "../../actions/smoothHeight";

	interface Props {
		onclose: () => void;
		initialTab?: "leaderboard" | "stats";
	}
	let { onclose, initialTab }: Props = $props();

	type TabType = "leaderboard" | "stats";
	
	// Порядок вкладок: Спочатку Лідерборд, потім Статистика
	const availableTabs: TabType[] = ["leaderboard", "stats"];

	// Дефолтна вкладка залежно від авторизації
	const defaultTab = $derived.by(() => {
		if (initialTab) return initialTab;
		return authStore.isGuest ? "stats" : "leaderboard";
	});

	const urlTab = $derived($page.url.searchParams.get("tab") as TabType | null);
	const activeTab = $derived(urlTab || defaultTab);

	function setActiveTab(tab: TabType) {
		navigationState.setTab(tab);
	}

	// Stats for ProfileStats
	const totalCorrect = $derived(progressStore.value.totalCorrect);
	const streak = $derived(progressStore.value.streak);
	const daysInApp = $derived(
		Math.max(
			1,
			Math.ceil(
				(Date.now() - (progressStore.value.firstSeenDate || Date.now())) /
					(1000 * 60 * 60 * 24),
			),
		),
	);
	const activeDaysCount = $derived(progressStore.value.activeDaysCount || 0);
	const accuracy = $derived(progressStore.getAccuracy());
	const bestStreak = $derived(progressStore.value.bestStreak || 0);
	const bestCorrectStreak = $derived(progressStore.value.bestCorrectStreak || 0);
	const correctToday = $derived(progressStore.todayActivity.totalCorrect || 0);
	const dailyAverage = $derived(progressStore.getDailyAverage());
	const levelStats = $derived(progressStore.value.levelStats || {});
</script>

{#snippet tabsNav()}
	<ProfileHeader hideEditButton={true} />

	<SegmentedControl
		options={availableTabs.map((id) => ({
			id,
			label: `profile.tabs.${id}`,
			icon: id === "stats" ? Target : Trophy,
			testId: `tab-${id}`,
		}))}
		value={activeTab}
		onchange={(id) => setActiveTab(id as TabType)}
	/>
{/snippet}

<BaseModal {onclose} testid="stats-modal">
	<div class="modal-internal-wrapper" use:smoothHeight={{ duration: 300 }}>
		<div class="modal-content-measure">
			{#if authStore.isGuest && activeTab === "leaderboard"}
				<div class="guest-warning-box" data-testid="guest-warning-box" style="margin-bottom: 1rem;">
					<div class="warning-icon"><Trophy size={48} /></div>
					<p>{$_("profile.leaderboardGuestMessage") || "Авторизуйтесь, щоб побачити інших гравців та їх статистику"}</p>
				</div>
			{/if}

			{@render tabsNav()}

			<div class="profile-content" data-testid="stats-content">
				<ErrorBoundary>
					{#key activeTab}
						{#if activeTab === "leaderboard"}
							{#if !authStore.isGuest}
								<Leaderboard />
							{/if}
						{:else if activeTab === "stats"}
							<ProfileStats
								{totalCorrect}
								{streak}
								{daysInApp}
								{activeDaysCount}
								{accuracy}
								{bestStreak}
								{bestCorrectStreak}
								{correctToday}
								{dailyAverage}
								{levelStats}
							/>
						{/if}
					{/key}
				</ErrorBoundary>
			</div>
		</div>
	</div>
</BaseModal>

<style>
	.modal-internal-wrapper {
		width: 100%;
		overflow: hidden;
	}
	.modal-content-measure {
		padding: 0;
	}
	.profile-content {
		margin-top: 1.5rem;
		min-height: 200px;
	}
	.guest-warning-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 20px;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		gap: 1rem;
		color: var(--text-secondary);
	}
	.warning-icon {
		color: var(--accent);
		opacity: 0.5;
	}
</style>
