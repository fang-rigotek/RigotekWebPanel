// src/style/theme.ts

/** 当前支持的主题列表（同时用于生成类型） */
const SUPPORTED_THEMES = ['light', 'dark'] as const;

/** 主题类型（自动从 SUPPORTED_THEMES 推导） */
export type Theme = typeof SUPPORTED_THEMES[number];

/** 判断是否为支持的主题 */
function isSupportedTheme(theme: string): theme is Theme {
  return (SUPPORTED_THEMES as readonly string[]).includes(theme);
}

export async function applyTheme(theme: Theme | undefined) {
  if (theme && isSupportedTheme(theme)) {
    document.body.setAttribute('data-theme', theme);
  }
}