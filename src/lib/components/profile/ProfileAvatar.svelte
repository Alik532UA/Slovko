<script lang="ts">
	import { _ } from "svelte-i18n";
	import { base } from "$app/paths";
	import {
		User,
		Edit2,
		Lock,
		Cat,
		Dog,
		Rabbit,
		Bird,
		Fish,
		Snail,
		Turtle,
		Bug,
		Smile,
		Star,
		Heart,
		Zap,
		Target,
	} from "lucide-svelte";
	import { authStore } from "../../controllers/AuthStore.svelte";
	import BaseTooltip from "../ui/BaseTooltip.svelte";

	/**
	 * АВАТАР ПРОФІЛЮ У ТРЬОХ СТАНАХ — і замок замість олівця для гостя.
	 *
	 * ## Що було не так
	 *
	 * Гість бачив на аватарі той самий олівець, що й власник акаунта: при
	 * наведенні спливала кругла кнопка редагування, натиск нічого не робив, і
	 * причини на екрані не було. Заборона стояла НІМИМ `if` у `ProfileModal`:
	 * `startEditingAvatar()` для гостя просто виходив. Автор спитав прямо: «чому
	 * коли ще не був виконений вхід кнопка виглядає як доступна?».
	 *
	 * Тепер стан видно з екрана: замок замість олівця, аватар пригашений, а при
	 * наведенні — причина словами. Німий `if` лишився другим шаром, бо
	 * недоступність, намальована лише стилями, тримається доти, доки хтось не
	 * покличе обробник іншим шляхом.
	 *
	 * ## Чому це заборона ЗАСТОСУНКУ, а не бази
	 *
	 * Правила дозволяють запис у `profiles/{uid}` власникові документа
	 * (`allow write: if isOwner(uid)`), і анонімний вхід — теж вхід: технічно
	 * такий користувач змінив би собі аватар. Але поки входу немає ЗОВСІМ,
	 * `uid` не існує — записувати нікуди й нікому. Плюс профіль гостя ніде не
	 * видно: анонімні відсіяні з таблиці лідерів, а друзі вимагають акаунта з
	 * обох боків. Тобто вибір аватара для гостя — не «майже працює», а робота
	 * в порожнечу.
	 *
	 * ## Чому окремий компонент
	 *
	 * `ProfileHeader` стояв на 385 SLOC при орієнтирі 300 (PROJECT-STRUCTURE-v8
	 * § 7) і був у переліку перевищень. Аватар — власна відповідальність:
	 * перелік іконок, три різні джерела картинки (внутрішня іконка, прапор,
	 * зовнішнє фото) і тепер три стани доступності. Шапка після виносу
	 * вкладається в орієнтир, а не «майже».
	 */
	interface Props {
		/**
		 * `edit` — кнопка з олівцем; `locked` — замок і причина при наведенні;
		 * `plain` — лише картинка (шапка в статистиці нічого не редагує).
		 */
		mode: "edit" | "locked" | "plain";
		onedit?: () => void;
	}

	let { mode, onedit }: Props = $props();

	const AVATAR_ICONS: Record<string, typeof User> = {
		user: User,
		cat: Cat,
		dog: Dog,
		rabbit: Rabbit,
		bird: Bird,
		fish: Fish,
		snail: Snail,
		turtle: Turtle,
		bug: Bug,
		smile: Smile,
		star: Star,
		heart: Heart,
		zap: Zap,
		target: Target,
	};

	function getIconComponent(iconId: string) {
		return AVATAR_ICONS[iconId] || User;
	}
</script>

<!--
	Сама картинка — сніпетом, бо однакова в усіх трьох станах, а от обгортка
	різна: кнопка, замкнена коробка й просто коробка. Копія розмітки на три
	гілки розійшлася б із першою ж правкою.
-->
{#snippet face()}
	{#if authStore.photoURL?.startsWith("internal:")}
		{@const parts = authStore.photoURL.split(":")}
		{@const iconId = parts[1]}
		{@const rawColor = parts[2]}
		{@const Icon = iconId === "none" ? null : getIconComponent(iconId)}
		{@const isFlag = rawColor?.startsWith("flag-")}
		<div
			class="avatar email-user"
			style:background-color={isFlag ? "transparent" : rawColor}
			aria-hidden="true"
			data-testid="profile-avatar-email-img"
		>
			{#if isFlag}
				{@const lang = rawColor.replace("flag-", "")}
				<div class="flag-bg-wrapper">
					<img src="{base}/svg/flags/{lang}.svg" alt="" class="flag-bg-img" loading="lazy" width="100%" height="100%" />
				</div>
			{/if}
			{#if Icon}
				<Icon size={72} color="white" />
			{/if}
		</div>
	{:else if authStore.photoURL}
		<img
			src={authStore.photoURL}
			alt=""
			class="avatar"
			aria-hidden="true"
			loading="lazy"
			width="80"
			height="80"
			data-testid="profile-avatar-img"
		/>
	{:else}
		<div class="avatar email-user" aria-hidden="true" data-testid="profile-avatar-default-img">
			<User size={72} />
		</div>
	{/if}
{/snippet}

<div class="avatar-slot">
	{#if mode === "locked"}
		<BaseTooltip text={$_("profile.editLocked")}>
			<div class="face-box is-locked" data-testid="avatar-locked-status">
				{@render face()}
				<div class="edit-overlay is-locked" aria-hidden="true">
					<Lock size={16} />
				</div>
			</div>
		</BaseTooltip>
	{:else if mode === "edit"}
		<button
			class="face-box is-editable"
			onclick={() => onedit?.()}
			type="button"
			aria-label={$_("profile.avatarEdit")}
			data-testid="edit-avatar-btn"
		>
			{@render face()}
			<div class="edit-overlay" aria-hidden="true">
				<Edit2 size={16} />
			</div>
		</button>
	{:else}
		<div class="face-box">{@render face()}</div>
	{/if}
</div>

<style>
	/*
	 * Гнізду потрібен `flex-shrink: 0`: у стані `locked` коренем стає обгортка
	 * підказки, а її класу звідси не дістати — стилі компонента до чужого
	 * кореня не доходять. Без цього аватар у вузькій шапці сплющувався б, бо
	 * текст поруч довший і флекс забирає місце саме в нього.
	 */
	.avatar-slot {
		display: flex;
		flex-shrink: 0;
	}

	.face-box {
		position: relative;
		background: none;
		border: none;
		padding: 0;
		border-radius: 20px;
		/* Коло замка вилазить за межі коробки — обрізати його нічим. */
		overflow: visible;
	}

	.face-box.is-editable {
		cursor: pointer;
		transition: var(--hover-transition);
	}

	.face-box.is-editable:hover {
		transform: scale(var(--hover-scale));
		z-index: 2;
	}

	/*
	 * Замкнений аватар НЕ збільшується при наведенні й показує `not-allowed`:
	 * рух під курсором — це обіцянка, що тут щось станеться.
	 */
	.face-box.is-locked {
		cursor: not-allowed;
	}

	.face-box.is-locked .avatar {
		opacity: 0.55;
		filter: grayscale(1);
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 24px;
		object-fit: cover;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--border);
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.flag-bg-wrapper {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.flag-bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar :global(svg) {
		position: relative;
		z-index: 1;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
	}

	@media (max-width: 480px) {
		.avatar {
			width: 64px;
			height: 64px;
			border-radius: 18px;
		}
	}

	/*
	 * Олівець проявляється при наведенні, а замок стоїть завжди: підказка на
	 * телефоні не показується (`BaseTooltip` її там ховає), тож замок — єдине,
	 * що там взагалі каже про стан. Значок, який теж з'являвся б лише під
	 * курсором, лишив би аватар на вигляд звичайним.
	 */
	.edit-overlay {
		position: absolute;
		bottom: 0;
		right: 0;
		background: var(--accent);
		color: white;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		opacity: 0;
		transition: opacity 0.2s;
		border: 2px solid var(--bg-primary);
	}

	.face-box.is-editable:hover .edit-overlay {
		opacity: 1;
	}

	.edit-overlay.is-locked {
		opacity: 1;
		background: var(--bg-primary);
		color: var(--text-secondary);
		border-color: var(--border);
	}
</style>
