// rwp_frontend/src/utils/assets.ts
// 按需加载静态资源

// 加载 CSS
export function ensureStylesheet(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`[assets] Failed to load CSS: ${href}`));

        document.head.appendChild(link);
    });
}
