import { logService, type logConfig } from './logService';
import { notificationStore } from '../stores/notificationStore.svelte';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

type LogCategory = keyof typeof logConfig;

interface ErrorOptions {
    showToast?: boolean;
    toastMessage?: string; // If not provided, will try to extract from error or use default
    rethrow?: boolean;
    category?: LogCategory;
}

/**
 * Centralized Error Handler
 * Unifies logging and UI notifications for errors.
 */
class ErrorHandler {
    
    /**
     * Handle an error: Log it and optionally notify the user.
     */
    handle(error: unknown, context: string, options: ErrorOptions = {}) {
        const { 
            showToast = false, 
            toastMessage, 
            rethrow = false,
            category = 'game' // Default category
        } = options;

        // 1. Extract Error Message
        const message = this.extractMessage(error);
        const stack = error instanceof Error ? error.stack : undefined;

        // 2. Log to Console/Service
        logService.error(category, `[${context}] ${message}`, error);

        // 3. Show Toast (if requested)
        if (showToast) {
            // Note: We're using raw strings here. For i18n, the caller should translate the message
            // or we could pass a translation key. 
            // For simplicity, we use the passed message or the error message.
            const uiMessage = toastMessage || message || 'An unexpected error occurred';
            notificationStore.error(uiMessage);
        }

        // 4. Rethrow if needed (e.g., for SvelteKit load functions to trigger +error.svelte)
        if (rethrow) {
            throw error;
        }
    }

    private extractMessage(error: unknown): string {
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        if (typeof error === 'object' && error !== null && 'message' in error) {
            return String((error as any).message);
        }
        return 'Unknown error';
    }
}

export const errorHandler = new ErrorHandler();
