// rwp_frontend/src/utils/resource-loader
// 按需加载静态资源

// 应用页面 CSS
export function setPageStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let link = document.querySelector<HTMLLinkElement>('link[data-type="page"]');

    if (link) {
      // 已存在，更新 href
      if (link.href.endsWith(href)) {
        resolve(); // 已经是目标样式
        return;
      }
      link.href = href;
    } else {
      // 不存在，创建新的
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-type', 'page');

      // 找到全局样式，插在它之后
      const globalLink = document.querySelector('link[data-type="global"]');
      if (globalLink && globalLink.parentNode) {
        globalLink.parentNode.insertBefore(link, globalLink.nextSibling);
      } else {
        document.head.appendChild(link); // fallback
      }
    }

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`[assets] Failed to load page CSS: ${href}`));
  });
}
