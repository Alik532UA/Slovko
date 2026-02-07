import { logService } from "../services/logService";

/**
 * Systemic V23: Robust Natural Strategy
 * Анімує висоту до повного природного розміру контенту.
 * Скрол делеговано на бекдроп (BaseModal), що гарантує відсутність обрізаного контенту.
 */
export function smoothHeight(node: HTMLElement, options = { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }) {
    // Мінімальне логування тільки для ініціалізації
    logService.log("ui", "smoothHeight initialized");

    let currentAnimation: Animation | null = null;
    let plannedTargetHeight = 0;
    
    node.style.overflow = 'hidden';
    node.style.display = 'block';
    node.style.boxSizing = 'border-box';

    const updateHeight = () => {
        const measure = node.querySelector('.modal-content-measure') as HTMLElement;
        if (!measure) return;

        const originalStyles = {
            position: measure.style.position,
            display: measure.style.display,
            width: measure.style.width,
            visibility: measure.style.visibility
        };

        measure.style.position = 'absolute';
        measure.style.display = 'block';
        measure.style.width = `${node.clientWidth}px`;
        measure.style.visibility = 'hidden';

        const targetHeight = Math.max(measure.offsetHeight, 200);

        measure.style.position = originalStyles.position;
        measure.style.display = originalStyles.display;
        measure.style.width = originalStyles.width;
        measure.style.visibility = originalStyles.visibility;

        if (Math.abs(targetHeight - plannedTargetHeight) < 1) return;

        const startHeight = node.getBoundingClientRect().height;
        plannedTargetHeight = targetHeight;

        if (currentAnimation) currentAnimation.cancel();

        currentAnimation = node.animate([
            { height: `${startHeight}px` },
            { height: `${targetHeight}px` }
        ], {
            duration: options.duration,
            easing: options.easing,
            fill: 'forwards'
        });

        currentAnimation.onfinish = () => {
            node.style.height = `${targetHeight}px`;
            currentAnimation = null;
        };
    };

    const resizeObserver = new ResizeObserver(() => updateHeight());
    const syncMeasure = () => {
        resizeObserver.disconnect();
        const measure = node.querySelector('.modal-content-measure');
        if (measure) resizeObserver.observe(measure);
    };

    const watcher = new MutationObserver(() => {
        syncMeasure();
        updateHeight();
    });
    watcher.observe(node, { childList: true });

    syncMeasure();
    updateHeight();

    return {
        update(newOptions: any) {
            options.duration = newOptions.duration || 400;
        },
        destroy() {
            if (currentAnimation) currentAnimation.cancel();
            resizeObserver.disconnect();
            watcher.disconnect();
        }
    };
}
