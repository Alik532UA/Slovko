<script lang="ts">
    import { _ } from "svelte-i18n";
    import { ArrowLeft } from "lucide-svelte";

    interface Props {
        mode: "register" | "signin" | "forgot-password";
        isLoading: boolean;
        errorMessage: string;
        successMessage: string;
        onsubmit: (email: string, password: string) => void;
        onback: () => void;
        onforgotPassword?: () => void;
    }

    let {
        mode,
        isLoading,
        errorMessage,
        successMessage,
        onsubmit,
        onback,
        onforgotPassword,
    }: Props = $props();

    let email = $state("");
    let password = $state("");

    function handleSubmit(e: Event) {
        e.preventDefault();
        onsubmit(email, password);
    }

    const titles: Record<string, string> = {
        register: "profile.registerTitle",
        signin: "profile.signinTitle",
        "forgot-password": "profile.forgotPasswordTitle",
    };

    const buttonLabels: Record<string, string> = {
        register: "profile.register",
        signin: "profile.login",
        "forgot-password": "profile.sendResetEmail",
    };

    const defaults: Record<string, { title: string; button: string }> = {
        register: { title: "Створити акаунт", button: "Зареєструватись" },
        signin: { title: "Увійти в акаунт", button: "Увійти" },
        "forgot-password": {
            title: "Відновлення пароля",
            button: "Надіслати лист",
        },
    };
</script>

<form
    class="email-form"
    data-testid="profile-{mode}-form"
    onsubmit={handleSubmit}
>
    <p class="form-title">
        {$_(titles[mode], { default: defaults[mode].title })}
    </p>

    {#if mode === "forgot-password"}
        <p class="form-subtitle">
            {$_("profile.forgotPasswordSubtitle", {
                default: "Введіть email, на який зареєстровано акаунт",
            })}
        </p>
        <p class="spam-warning">
            ⚠️ {$_("profile.spamWarning", {
                default: "Лист може потрапити в папку «Спам»",
            })}
        </p>
    {/if}

    <input
        type="email"
        placeholder="Email"
        bind:value={email}
        class="input-field"
        data-testid="profile-{mode}-email-input"
        autocomplete="email"
    />

    {#if mode !== "forgot-password"}
        <input
            type="password"
            placeholder={mode === "register"
                ? $_("profile.passwordPlaceholder", {
                      default: "Пароль (мін. 6 символів)",
                  })
                : $_("profile.passwordPlaceholderShort", { default: "Пароль" })}
            bind:value={password}
            class="input-field"
            data-testid="profile-{mode}-password-input"
            autocomplete={mode === "register"
                ? "new-password"
                : "current-password"}
        />
    {/if}

    {#if errorMessage}
        <p class="error-msg">{errorMessage}</p>
    {/if}

    {#if successMessage}
        <p class="success-msg">{successMessage}</p>
    {/if}

    <button
        type="submit"
        class="login-btn"
        data-testid="profile-{mode}-submit-btn"
        disabled={isLoading}
    >
        {isLoading
            ? "..."
            : $_(buttonLabels[mode], { default: defaults[mode].button })}
    </button>

    {#if mode === "signin" && onforgotPassword}
        <button
            type="button"
            class="forgot-password-btn"
            data-testid="profile-forgot-password-btn"
            onclick={onforgotPassword}
        >
            {$_("profile.forgotPassword", { default: "Забули пароль?" })}
        </button>
    {/if}

    <button
        type="button"
        class="back-btn"
        data-testid="profile-back-btn"
        onclick={onback}
    >
        <ArrowLeft size={16} />
        {mode === "forgot-password"
            ? $_("profile.backToSignin", { default: "Повернутись до входу" })
            : $_("profile.back", { default: "Назад" })}
    </button>
</form>

<style>
    .email-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-title {
        font-size: 1.25rem;
        font-weight: 600;
        text-align: center;
        margin: 0;
        color: var(--text-primary);
    }

    .form-subtitle {
        font-size: 0.9rem;
        text-align: center;
        color: var(--text-secondary);
        margin: 0;
    }

    .spam-warning {
        font-size: 0.85rem;
        text-align: center;
        color: var(--toast-warning, #f59e0b);
        margin: 0;
        padding: 0.5rem;
        background: rgba(245, 158, 11, 0.1);
        border-radius: 8px;
    }

    .input-field {
        padding: 0.75rem 1rem;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;
    }

    .input-field:focus {
        outline: none;
        border-color: var(--accent);
    }

    .login-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        background: var(--accent);
        color: white;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.2s;
    }

    .login-btn:hover:not(:disabled) {
        background: var(--accent-hover);
    }

    .login-btn:disabled {
        opacity: 0.6;
    }

    .forgot-password-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: underline;
    }

    .forgot-password-btn:hover {
        color: var(--accent);
    }

    .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: var(--bg-secondary);
        border-radius: 12px;
        padding: 0.75rem;
        color: var(--text-primary);
        font-size: 0.9rem;
        transition: all 0.2s;
    }

    .back-btn:hover {
        background: var(--border);
    }

    .error-msg {
        color: var(--toast-error, #ef4444);
        font-size: 0.9rem;
        text-align: center;
        margin: 0;
    }

    .success-msg {
        color: var(--toast-success, #22c55e);
        font-size: 0.9rem;
        text-align: center;
        margin: 0;
    }
</style>
