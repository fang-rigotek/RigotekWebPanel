// rigotek-web-ui/icons/LoadingLoop.tsx
// 功能：CSS 复刻 line-md:loading-loop 图标动画（不使用 <animate> / <animateTransform>）
// 属性：size（像素大小，默认 24）、className、style（均可选）

import { JSX } from 'preact';

export interface LoadingLoopProps {
  size?: number;                              // 图标尺寸，单位 px
  className?: string;                         // 外部可追加 class
  style?: JSX.CSSProperties;                  // 外部可覆盖样式
}

export default function LoadingLoop({
  size = 24,
  className,
  style,
}: LoadingLoopProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      class={className}
      style={style}
    >
      {/* 旋转容器（绕 viewBox 中心 12,12 旋转） */}
      <g class="ldg-rotor">
        {/* 弧线：先用描边动画从“未绘制”到“已绘制” */}
        <path
          class="ldg-arc"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3c4.97 0 9 4.03 9 9"
        />
      </g>

      {/* 私有样式：仅作用于此组件实例 */}
      <style>
        {`
          /* 描边显现：stroke-dashoffset 16 → 0，耗时 0.2s，保持最后状态 */
          .ldg-arc {
            stroke-dasharray: 16;
            stroke-dashoffset: 16;
            animation: ldg-draw 0.2s forwards;
          }
          @keyframes ldg-draw {
            to { stroke-dashoffset: 0; }
          }

          /* 围绕 viewBox(12,12) 无限旋转，周期 1.5s，与原作一致 */
          svg .ldg-rotor {
            transform-box: view-box;
            transform-origin: 12px 12px;
            animation: ldg-rotate 1.5s linear infinite;
          }
          @keyframes ldg-rotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}
      </style>
    </svg>
  );
}
