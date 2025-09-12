import { render } from 'preact';
import { type Icon } from '@/components';
import { context } from '@/context';

/** 局部刷新状态页 */
export async function updateStatusPage({
  text,
  IconComponent,
  paragraph,
}: {
  text?: string;
  IconComponent?: Icon;
  paragraph?: string;
}): Promise<void> {
  const root = document.getElementById("root")!;
  const statusContent = root.querySelector(".status-content") as HTMLElement;
  const statusHeader = root.querySelector(".status-header") as HTMLElement;

  // 以 header 的位置作为基准，解决垂直居中时看不到位移的问题
  const firstHeaderTop = statusHeader.getBoundingClientRect().top;

  await context.uiRenderPromise;

  // —— 更新标题 —— //
  if (text !== undefined) {
    const h5 = root.querySelector(".status-title h5") as HTMLHeadingElement;
    h5.textContent = text;
  }

  // —— 更新/插入图标 —— //
  if (IconComponent !== undefined) {
    let iconContainer = root.querySelector(".status-icon") as HTMLElement | null;
    if (!iconContainer) {
      iconContainer = document.createElement("div");
      iconContainer.className = "status-icon";
      statusHeader.insertBefore(iconContainer, statusHeader.firstChild);
    }
    iconContainer.innerHTML = "";
    render(<IconComponent className="icon" />, iconContainer);
  }

  // —— 更新/插入段落（首次插入时做渐入） —— //
  if (paragraph !== undefined) {
    let paragraphContainer = root.querySelector(".status-paragraph") as HTMLElement | null;
    const isNew = !paragraphContainer;

    if (!paragraphContainer) {
      paragraphContainer = document.createElement("div");
      paragraphContainer.className = "status-paragraph";
      statusContent.appendChild(paragraphContainer);

      // 渐入准备：初始无动画地设为透明
      paragraphContainer.style.transition = "none";
      paragraphContainer.style.opacity = "0";
    }

    let p = paragraphContainer.querySelector("p") as HTMLParagraphElement | null;
    if (!p) {
      p = document.createElement("p");
      paragraphContainer.appendChild(p);
    }
    p.textContent = paragraph;

    if (isNew) {
      // 让初始透明状态生效
      void paragraphContainer.offsetHeight;
      // 恢复到使用样式表中的 transition，并启动渐入
      paragraphContainer.style.transition = "";
      paragraphContainer.style.opacity = "1";
    }
  }

  // —— 纵向位移动画：用 header 的位移差平移整个 status-content —— //
  const lastHeaderTop = statusHeader.getBoundingClientRect().top;
  const dy = firstHeaderTop - lastHeaderTop;

  if (Math.abs(dy) > 0.5) {
    const prevInlineTransition = statusContent.style.transition;
    statusContent.style.transition = "none";
    statusContent.style.transform = `translateY(${dy}px)`;
    void statusContent.offsetHeight;
    requestAnimationFrame(() => {
      statusContent.style.transition = prevInlineTransition || ""; // 使用全局的 transition: all 0.5s ease
      statusContent.style.transform = "translateY(0)";
    });
  }
  const delay = new Promise(r => setTimeout(r, 500));
  await delay;
}
