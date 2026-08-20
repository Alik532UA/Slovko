<script lang="ts">
	import BaseModal from "./BaseModal.svelte";
	import { speechModalStore } from "$lib/controllers/SpeechModalStore.svelte";
	import { _ } from "svelte-i18n";

	/**
	 * Назва мови, яку далі вставляють у розмітку через `{@html}` — тож вона
	 * САНІТИЗУЄТЬСЯ, а не «і так безпечна» (SECURITY-v8 § 5).
	 *
	 * Сьогодні джерел два, і жодне не приходить від відвідувача: ключ словника
	 * проєкту або код мови з закритого переліку `Language`. Тобто дірки немає —
	 * але вона з'явиться тихо, щойно `lang` почне приходити, скажімо, з адреси
	 * чи з профілю. Тому межа стоїть тут, у єдиному місці, де значення
	 * перетворюється в HTML, а не в кожного з майбутніх викликачів.
	 *
	 * Дозволено літери, пробіли, дефіс і апостроф — усе, з чого складаються
	 * назви мов у семи словниках («Кримськотатарська», «Nederlands»). Кутові
	 * дужки, лапки й амперсанд відкидаються, тобто нічого з цього значення не
	 * може стати теґом чи атрибутом.
	 */
	const asPlainName = (value: string) => value.replace(/[^\p{L}\p{M}\s'’-]/gu, "");

	let langName = $derived(
		$_(`language.${speechModalStore.lang}`) || speechModalStore.lang.toUpperCase()
	);
</script>

{#if speechModalStore.isOpen}
	<BaseModal 
		testid="speech-error-modal" 
		onclose={() => speechModalStore.close()}
		maxWidth="500px"
	>
		<div class="content">
			<h2>{$_("errors.speech.modalTitle") || "Помилка озвучення"}</h2>
			
			<div class="description">
				<p>
					{$_("errors.speech.modalDesc1") || "Slovko не має вбудованої озвучки, а використовує системні можливості вашого пристрою."}
				</p>
				<p>
					<!--
						Санітизація стоїть ТУТ, у самому виразі, а не рядком вище: це
						єдине місце, де значення перетворюється в розмітку, і читач
						(як і гейт `security.test.ts`) мусить бачити гарантію там,
						де вона потрібна, а не шукати її в іншому місці файлу.
					-->
					{@html $_("errors.speech.modalDesc2", {
						values: { lang: `<strong>${asPlainName(langName)}</strong>` },
						default: `На жаль, ваш поточний браузер або операційна система не підтримують синтез мовлення для <strong>${asPlainName(langName)}</strong> мови.`,
					})}
				</p>
				<p>
					{$_("errors.speech.modalDesc3") || "Спробуйте скористатися іншим браузером (наприклад, Chrome чи Safari) або перевірте системні налаштування."}
				</p>
			</div>

			<div class="actions">
				<button class="btn-primary" onclick={() => speechModalStore.close()}>
					{$_("common.ok") || "Зрозуміло"}
				</button>
			</div>
		</div>
	</BaseModal>
{/if}

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		text-align: center;
	}

	h2 {
		margin: 0;
		color: var(--text-primary);
		font-size: 1.5rem;
	}

	.description {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: var(--text-secondary);
		line-height: 1.5;
		text-align: left;
		background: var(--bg-secondary);
		padding: 1.25rem;
		border-radius: 12px;
		border: 1px solid var(--glass-border);
	}

	.description p {
		margin: 0;
	}

	.actions {
		display: flex;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: transform 0.2s, filter 0.2s;
	}

	.btn-primary:hover {
		transform: scale(1.05);
		filter: brightness(1.1);
	}
</style>
