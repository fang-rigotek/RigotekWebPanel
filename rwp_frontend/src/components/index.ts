// rwp_frontend/src/components/icons/index.ts
import type { FunctionComponent } from 'preact';

export type Icon = FunctionComponent<{ className?: string; animated?: boolean }>;

/**
 * 动态加载图标组件
 */
export async function loadIcon(name: string): Promise<Icon> {
  const mod = await import(`./icons/${name}.tsx`);
  return mod.default as Icon;
}
