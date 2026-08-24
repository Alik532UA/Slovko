<script lang="ts">
	import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { _ } from 'svelte-i18n';

	interface Props {
		id?: string;
		value: string;
		label?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		testId?: string;
		required?: boolean;
		disabled?: boolean;
		oninput?: (e: Event) => void;
	}

	let {
		id = 'password',
		value = $bindable(''),
		label = 'Пароль',
		autocomplete = 'current-password',
		testId = 'auth-password',
		required = true,
		disabled = false,
		oninput
	}: Props = $props();

	let showPassword = $state(false);
	let isCapsLockOn = $state(false);
	let isNonLatinLayout = $state(false);

	// Перевірка наявних не-латинських (наприклад, кириличних) символів у паролі
	$effect(() => {
		const hasNonLatin = /[а-щьюяєіїґА-ЩЬЮЯЄІЇҐа-яА-ЯёЁ]/i.test(value);
		isNonLatinLayout = hasNonLatin;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (typeof e.getModifierState === 'function') {
			isCapsLockOn = e.getModifierState('CapsLock');
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (typeof e.getModifierState === 'function') {
			isCapsLockOn = e.getModifierState('CapsLock');
		}
	}

	function toggleVisibility() {
		showPassword = !showPassword;
	}
</script>

<div class="password-field-container">
	<!--
		`has-input-tools` — ознака поля з кнопками ВСЕРЕДИНІ (INPUT-TOOLS-v8 § 4.1).
		Від цього предка залежить рівень «курсор десь у полі»; сама драбина
		прозорості живе в `app.css` — там і пояснення, чому вона там, а не тут.
	-->
	<div class="input-with-icon has-input-tools">
		<Lock size={18} class="input-icon lead" aria-hidden="true" />
		<input
			{id}
			type={showPassword ? 'text' : 'password'}
			bind:value
			class="form-input"
			placeholder=" "
			{autocomplete}
			{required}
			{disabled}
			data-testid="{testId}-input"
			onkeydown={handleKeydown}
			onkeyup={handleKeyUp}
			{oninput}
		/>
		<label for={id} class="floating-label">{label}</label>

		<!--
			Кнопка-око — ПЕРША й поки єдина в трейлінгу (§ 3.1): її шукають наосліп
			і частіше за очищення. `input-tools__btn` — спільний клас усіх кнопок у
			полі; свій `visibility-toggle` лишається за розташування й колір.
		-->
		<button
			type="button"
			class="visibility-toggle input-tools__btn"
			onclick={toggleVisibility}
			tabindex="-1"
			aria-label={showPassword
				? $_('profile.hidePassword') || 'Приховати пароль'
				: $_('profile.showPassword') || 'Показати пароль'}
			data-testid="{testId}-toggle"
		>
			{#if showPassword}
				<EyeOff size={18} />
			{:else}
				<Eye size={18} />
			{/if}
		</button>
	</div>

	{#if isCapsLockOn}
		<p class="warning-hint capslock-hint" data-testid="{testId}-capslock-warning">
			<AlertCircle size={14} />
			<span>{$_('profile.capsLockOn') || 'CapsLock увімкнено'}</span>
		</p>
	{/if}

	{#if isNonLatinLayout}
		<p class="warning-hint layout-hint" data-testid="{testId}-layout-warning">
			<AlertCircle size={14} />
			<span>{$_('profile.checkLayout') || 'Перевірте розкладку клавіатури (введено нелатинські символи)'}</span>
		</p>
	{/if}
</div>

<style>
	.password-field-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
	}

	.input-with-icon {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		--input-icon-color: var(--text-secondary, #6b7280);
		--input-bg: var(--bg-surface, var(--bg-primary, #fff));
	}

	:global(.input-icon.lead) {
		position: absolute;
		left: 1rem;
		opacity: 0.65;
		color: var(--input-icon-color);
		pointer-events: none;
		z-index: 1;
	}

	.form-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.9rem 2.75rem 0.9rem 3rem;
		background: var(--input-bg);
		border: 1px solid var(--border, rgba(128, 128, 128, 0.3));
		border-radius: 14px;
		color: var(--text-primary, #000);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent, #3b82f6);
	}

	.floating-label {
		position: absolute;
		left: 3rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--input-icon-color);
		pointer-events: none;
		background: var(--input-bg);
		padding: 0 0.25rem;
		transition: top 0.15s, transform 0.15s, color 0.15s;
		border-radius: 4px;
	}

	.form-input:focus ~ .floating-label,
	.form-input:not(:placeholder-shown) ~ .floating-label {
		top: 0;
		transform: translateY(-50%) scale(0.82);
		color: var(--accent, #3b82f6);
	}

	/*
	 * БЕЗ `opacity` І БЕЗ `transition`, і це не недогляд.
	 *
	 * Обидві властивості переїхали в `app.css`, до драбини чотирьох рівнів
	 * (INPUT-TOOLS-v8 § 4). Тут стояли `opacity: 0.7` у спокої та `1` на
	 * наведенні — тобто дві сходинки з чотирьох, без рівня «курсор десь у полі»,
	 * без `:focus-visible` і без `@media (hover: none)`.
	 *
	 * Повернути їх сюди означало б тихо зламати драбину: scoping Svelte додає до
	 * селектора клас, тож `.visibility-toggle` (0,2,0) переважив би глобальне
	 * базове правило, а `.visibility-toggle:hover` (0,3,0) — усі три сходинки
	 * наведення. Так само й `transition`: без `opacity` у переліку сходинки
	 * міняли б значення миттєво (§ 7).
	 */
	.visibility-toggle {
		position: absolute;
		right: 0.85rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: var(--input-icon-color);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
	}

	.visibility-toggle:hover {
		color: var(--text-primary, #000);
	}

	.warning-hint {
		display: flex;
		align-items: flex-start;
		gap: 0.35rem;
		font-size: 0.8rem;
		margin: 0.15rem 0 0 0.5rem;
		color: var(--toast-warning, #f59e0b);
		white-space: pre-line;
	}

	:global(.warning-hint svg) {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		margin-top: 0.1rem;
	}
</style>
