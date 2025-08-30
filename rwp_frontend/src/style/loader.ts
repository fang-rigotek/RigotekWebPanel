// rwp_frontend/src/style/loader.ts

/** 加载 page 样式，始终插在 global 样式之后 */
export function loadPageStylesheet(href: string): Promise<void> {
  const exists = document.querySelector<HTMLLinkElement>(
    `link[rel="stylesheet"][href="${href}"]`
  );
  if (exists) return Promise.resolve();

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-type', 'page');

  const globalLink = document.querySelector<HTMLLinkElement>('link[data-type="global"]')!;

  return new Promise<void>((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`[assets] Failed to load page CSS: ${href}`));

    globalLink.parentNode!.insertBefore(link, globalLink.nextSibling);
  });
}

/** 卸载 page 样式（只移除第一个匹配项，带错误处理） */
export function unloadPageStylesheet(href: string): void {
  try {
    const link = document.querySelector<HTMLLinkElement>(
      `link[rel="stylesheet"][href="${href}"]`
    );
    if (!link) {
      console.warn(`[assets] No page CSS found to unload: ${href}`);
      return;
    }
    link.parentNode?.removeChild(link);
  } catch (err) {
    console.error(`[assets] Failed to unload page CSS: ${href}`, err);
  }
}
