import { logService } from "../services/logService.svelte";

/**
 * Systemic V24: Robust Universal Strategy
 * Анімує висоту до повного природного розміру контенту.
 * Може використовувати .modal-content-measure для точного вимірювання 
 * або саме себе (node), якщо контент не обрізаний.
 */
export function smoothHeight(node: HTMLElement, options: { duration?: number, easing?: string, minHeight?: number } = {}) {
    // Мінімальне логування тільки для ініціалізації
    logService.log("ui", "smoothHeight initialized");

    const d = options.duration ?? 300;
    const e = options.easing ?? 'cubic-bezier(0.4, 0, 0.2, 1)';
    const minH = options.minHeight ?? 0;

    let currentAnimation: Animation | null = null;
    let plannedTargetHeight = 0;
    
    node.style.overflow = 'hidden';
    // Не форсуємо display: block, якщо вже встановлено щось інше (наприклад flex)
    if (!node.style.display) {
        node.style.display = 'block';
    }
    node.style.boxSizing = 'border-box';

    const updateHeight = () => {
        // Пріоритет спеціальному елементу для вимірювання, якщо він є
        const measure = (node.querySelector('.modal-content-measure') || node) as HTMLElement;
        if (!measure) return;

        let targetHeight = 0;

        if (measure === node) {
            // Якщо вимірюємо сам вузол, нам потрібно тимчасово дозволити йому рости
            const prevHeight = node.style.height;
            node.style.height = 'auto';
            targetHeight = node.offsetHeight;
            node.style.height = prevHeight;
        } else {
            // Класична стратегія з measure-елементом
            const originalStyles = {
                position: measure.style.position,
                display: measure.style.display,
                width: measure.style.width,
                visibility: measure.style.visibility
            };

            measure.style.position = 'absolute';
            // Не змінюємо display, якщо це flex/grid, щоб не зламати розрахунок висоти
            if (originalStyles.display !== 'flex' && originalStyles.display !== 'grid') {
                measure.style.display = 'block';
            }
            measure.style.width = `${node.clientWidth}px`;
            measure.style.visibility = 'hidden';

            targetHeight = measure.offsetHeight;

            measure.style.position = originalStyles.position;
            measure.style.display = originalStyles.display;
            measure.style.width = originalStyles.width;
            measure.style.visibility = originalStyles.visibility;
        }

        targetHeight = Math.max(targetHeight, minH);

        if (Math.abs(targetHeight - plannedTargetHeight) < 1) return;

        const startHeight = node.getBoundingClientRect().height;
        plannedTargetHeight = targetHeight;

        if (currentAnimation) currentAnimation.cancel();

        currentAnimation = node.animate([
            { height: `${startHeight}px` },
            { height: `${targetHeight}px` }
        ], {
            duration: d,
            easing: e,
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
        const measure = node.querySelector('.modal-content-measure') || node;
        if (measure) resizeObserver.observe(measure);
    };

    const watcher = new MutationObserver((mutations) => {
        // Перевіряємо чи не додано/видалено .modal-content-measure
        const measureChanged = mutations.some(m => 
            Array.from(m.addedNodes).some(n => (n as HTMLElement).classList?.contains('modal-content-measure')) ||
            Array.from(m.removedNodes).some(n => (n as HTMLElement).classList?.contains('modal-content-measure'))
        );
        
        if (measureChanged) syncMeasure();
        updateHeight();
    });

    watcher.observe(node, { childList: true, subtree: true, characterData: true });

    syncMeasure();
    updateHeight();

    return {
        update(newOptions: any) {
            options.duration = newOptions.duration || 300;
            options.minHeight = newOptions.minHeight ?? 0;
        },
        destroy() {
            if (currentAnimation) currentAnimation.cancel();
            resizeObserver.disconnect();
            watcher.disconnect();
        }
    };
}
