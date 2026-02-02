<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { setInterfaceLanguage, LANGUAGES } from "$lib/i18n/init";
    import { LANGUAGE_NAMES, type Language } from "$lib/types";
    import { base } from "$app/paths";
    import { _ } from "svelte-i18n";

    let step = $state(1);
    let detectedLang = $state("en");
    let isVisible = $state(true);
    let isFinalizing = $state(false);
    let selectedFlags = $state<Language[]>([]);
    
    // Координати для анімації
    let flyingFlags = $state<{ lang: Language, x: number, y: number, tx: number, ty: number, delay: number }[]>([]);

    const titles: Record<string, string> = {
        uk: "Твоя мова",
        en: "Your language",
        de: "Deine Sprache",
        nl: "Jouw taal",
        el: "Η γλώσσα σου",
        crh: "Seniñ tiliñ"
    };

    onMount(() => {
        // Миттєво встановлюємо мову за браузером
        const browserLangs = navigator.languages || [navigator.language];
        for (const lang of browserLangs) {
            const shortLang = lang.split("-")[0];
            if (LANGUAGES.includes(shortLang as Language)) {
                detectedLang = shortLang;
                break;
            }
        }
    });

    async function selectStep1(lang: Language) {
        settingsStore.update({
            interfaceLanguage: lang,
            targetLanguage: lang
        });
        await setInterfaceLanguage(lang);
        selectedFlags.push(lang);
        step = 2;
    }

    function selectStep2(lang: Language) {
        if (lang === settingsStore.value.targetLanguage) {
            settingsStore.update({ sourceLanguage: "en" });
        } else {
            settingsStore.update({ sourceLanguage: lang });
        }
        selectedFlags.push(lang);
        animateAndFinish();
    }

    async function animateAndFinish() {
        // 1. Починаємо фіналізацію (заголовок зникне через svelte-if, фон стане прозорим через клас)
        isFinalizing = true;
        
        // Знаходимо ціль
        const settingsBtn = document.querySelector('[data-testid="language-settings-btn"]');
        if (settingsBtn) {
            const targetRect = settingsBtn.getBoundingClientRect();
            const tx = targetRect.left + targetRect.width / 2;
            const ty = targetRect.top + targetRect.height / 2;

            const flagElements = document.querySelectorAll('.flag-btn');
            const newFlyingFlags: any[] = [];
            
            flagElements.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const lang = el.getAttribute('data-lang') as Language;
                newFlyingFlags.push({
                    lang,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    tx, ty,
                    delay: index * 0.05
                });
            });
            
            // 2. Включаємо літаючі прапори
            flyingFlags = newFlyingFlags;

            // 2.5. Блимаємо кнопкою, коли прапори долітають (через ~2с)
            setTimeout(() => {
                const btn = document.querySelector('[data-testid="language-settings-btn"]');
                if (btn) {
                    btn.classList.add('settings-btn-blink');
                    // Видаляємо клас після завершення анімації
                    setTimeout(() => btn.classList.remove('settings-btn-blink'), 2000);
                }
            }, 2000);
        }

        // 3. Завершуємо все через 3.5с (даємо час на блимання)
        setTimeout(() => {
            isVisible = false;
            settingsStore.completeOnboarding();
        }, 3500);
    }

    const firstTitle = $derived(`${titles[detectedLang] || titles.en} / ${titles.en}`);
</script>

{#if isVisible}
    <div class="onboarding-overlay" class:transparent={isFinalizing} transition:fade>
        <div class="container">
            <div class="header-area">
                {#if !isFinalizing}
                    {#key step}
                        <h1 in:fade={{ duration: 400, delay: 200 }} out:fade={{ duration: 300 }}>
                            {step === 1 ? firstTitle : $_("onboarding.whatToLearn")}
                        </h1>
                    {/key}
                {/if}
            </div>

            <div class="flags-grid" class:hidden={isFinalizing}>
                {#each LANGUAGES as lang}
                    <button 
                        class="flag-btn" 
                        class:selected-step1={step === 2 && lang === settingsStore.value.targetLanguage}
                        data-lang={lang}
                        onclick={() => !isFinalizing && (step === 1 ? selectStep1(lang) : selectStep2(lang))}
                        disabled={isFinalizing || (step === 2 && lang === settingsStore.value.targetLanguage)}
                        data-testid="onboarding-flag-{lang}"
                    >
                        <img src="{base}/flags/{lang}.svg" alt={LANGUAGE_NAMES[lang]} />
                        <span>{LANGUAGE_NAMES[lang]}</span>
                    </button>
                {/each}
            </div>
        </div>

        {#if isFinalizing}
            <div class="flying-container">
                {#each flyingFlags as flag}
                    <div 
                        class="flying-flag" 
                        style:--start-x="{flag.x}px"
                        style:--start-y="{flag.y}px"
                        style:--target-x="{flag.tx}px"
                        style:--target-y="{flag.ty}px"
                        style:--delay="{flag.delay}s"
                    >
                        <img src="{base}/flags/{flag.lang}.svg" alt="" />
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .onboarding-overlay {
        position: fixed;
        inset: 0;
        z-index: 20000;
        background: rgba(0, 0, 0, 0.92);
        backdrop-filter: blur(15px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        transition: background 1.6s ease, backdrop-filter 1.6s ease;
    }

    .onboarding-overlay.transparent {
        background: rgba(0, 0, 0, 0);
        backdrop-filter: blur(0px);
        pointer-events: none;
    }

    .container {
        max-width: 600px;
        width: 100%;
        text-align: center;
    }

    .header-area {
        height: 100px;
        position: relative;
        width: 100%;
        margin-bottom: 2rem;
    }

    h1 {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        font-size: 2.2rem;
        margin: 0;
        color: white;
        font-weight: 700;
        line-height: 1.2;
    }

    .flags-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        transition: opacity 0.2s;
    }

    .flags-grid.hidden {
        opacity: 0; /* Миттєво ховаємо оригінали, коли з'являються літаючі копії */
    }

    @media (max-width: 480px) {
        .flags-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .flag-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 1.5rem 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
        color: white;
    }

    .flag-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-5px);
        border-color: var(--accent);
    }

    .flag-btn:disabled {
        opacity: 0.3;
        cursor: default;
    }

    /* Вибрана мова на 1 кроці має виглядати заблокованою на 2 кроці */
    .flag-btn.selected-step1 {
        opacity: 0.4 !important;
        border-color: rgba(255, 255, 255, 0.1);
        background: transparent;
        cursor: default;
        transform: none !important; /* Прибрати підйом при наведенні */
    }

    .flag-btn.selected-step1 img {
        filter: grayscale(0.2); /* Легкий ефект 'минулого' */
    }

    .flag-btn img {
        width: 80px;
        height: 54px;
        object-fit: cover;
        border-radius: 10px;
    }

    .flag-btn span { font-size: 1rem; }

    .flying-container {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 20001;
    }

    .flying-flag {
        position: fixed;
        top: 0;
        left: 0;
        width: 80px;
        height: 54px;
        animation: fly-to-settings 2s forwards cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: var(--delay);
        transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%);
    }

    .flying-flag img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    }

    @keyframes fly-to-settings {
        0% {
            transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        20% {
            transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%) scale(1.1);
            opacity: 1;
        }
        100% {
            transform: translate(var(--target-x), var(--target-y)) translate(-50%, -50%) scale(0.1);
            opacity: 0;
        }
    }

    :global(.settings-btn-blink) {
        animation: settings-blink-pulse 1.5s ease-in-out;
    }

    @keyframes settings-blink-pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(58, 143, 214, 0);
            transform: scale(1);
        }
        50% {
            box-shadow: 0 0 15px 2px rgba(58, 143, 214, 0.4);
            transform: scale(1.1);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(58, 143, 214, 0);
            transform: scale(1);
        }
    }
</style>