/**
 * Analytics Service - Handles Google Analytics 4 integration
 */

export const GA_ID = import.meta.env.VITE_GA_ID;

export const initGA = () => {
    if (typeof window === 'undefined' || !GA_ID) return;

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
        page_path: window.location.pathname,
    });
};

/**
 * Track page view manually (useful for SPA transitions if automatic tracking is not enough)
 */
export const trackPageView = (path: string) => {
    if (typeof window !== 'undefined' && window.gtag && GA_ID) {
        window.gtag('config', GA_ID, {
            page_path: path,
        });
    }
};

/**
 * Track custom events
 */
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag && GA_ID) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
};

// Add global type definition for gtag
declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}
