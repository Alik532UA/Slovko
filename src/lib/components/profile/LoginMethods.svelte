<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Mail, ArrowLeft } from "lucide-svelte";

    interface Props {
        isLoading: boolean;
        ongoogle: () => void;
        onemailRegister: () => void;
        onemailSignin: () => void;
        onback: () => void;
    }

    let { isLoading, ongoogle, onemailRegister, onemailSignin, onback }: Props =
        $props();
</script>

<div class="login-options" data-testid="login-methods-container">
    <button
        class="method-btn google"
        data-testid="profile-google-btn"
        onclick={ongoogle}
        disabled={isLoading}
    >
        <svg viewBox="0 0 24 24" width="20" height="20">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
        {$_("profile.googleAuth", { default: "Авторизація через Google" })}
    </button>

    <button
        class="method-btn email"
        data-testid="profile-register-email-btn"
        onclick={onemailRegister}
        disabled={isLoading}
    >
        <Mail size={20} />
        {$_("profile.emailRegister", {
            default: "Реєстрація за допомогою email",
        })}
    </button>

    <button
        class="method-btn signin"
        data-testid="profile-signin-email-btn"
        onclick={onemailSignin}
        disabled={isLoading}
    >
        <Mail size={20} />
        {$_("profile.signin", { default: "Вхід за допомогою email" })}
    </button>

    <button class="back-btn" data-testid="profile-back-btn" onclick={onback}>
        <ArrowLeft size={16} />
        {$_("profile.back", { default: "Назад" })}
    </button>
</div>

<style>
    .login-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .method-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid var(--border);
    }

    .method-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .method-btn.google {
        background: white;
        color: #333;
    }

    .method-btn.google:hover:not(:disabled) {
        background: #f5f5f5;
    }

    .method-btn.email {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    .method-btn.email:hover:not(:disabled) {
        background: var(--accent-hover);
    }

    .method-btn.signin {
        background: var(--bg-primary);
        color: var(--text-primary);
    }

    .method-btn.signin:hover:not(:disabled) {
        background: var(--bg-secondary);
    }

    .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 0.9rem;
        cursor: pointer;
        padding: 0.5rem;
        margin-top: 0.5rem;
    }

    .back-btn:hover {
        color: var(--text-primary);
    }
</style>
