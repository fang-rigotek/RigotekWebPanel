// rigotek-web-ui/icons/AlertCircle.tsx
// 功能：CSS 复刻 line-md:alert-circle 图标（不使用 <animate>，完全用 CSS keyframes）
// 属性：size（像素大小，默认 24）、className、style（均可选）

import { JSX } from 'preact';

export interface AlertCircleProps {
  size?: number;               // 图标尺寸，单位 px
  className?: string;          // 外部可追加 class
  style?: JSX.CSSProperties;   // 外部可覆盖样式
}

export default function AlertCircle({
  size = 24,
  className,
  style,
}: AlertCircleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      class={className}
      style={style}
    >
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        {/* 外圈路径：0.6s 画完（stroke-dashoffset: 64 → 0） */}
        <path
          class="a-circle"
          d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z"
        />
        {/* 竖线：延迟 0.6s，耗时 0.2s（8 → 0） */}
        <path class="a-line" d="M12 7v6" />
        {/* 圆点：延迟 0.8s，耗时 0.2s（2 → 0） */}
        <path class="a-dot" d="M12 17v0.01" />
      </g>

      {/* 私有样式，仅作用于此组件实例 */}
      <style>
        {`
          .a-circle {
            stroke-dasharray: 64;
            stroke-dashoffset: 64;
            animation: a-circle-draw 0.6s forwards;
          }
          @keyframes a-circle-draw {
            to { stroke-dashoffset: 0; }
          }

          .a-line {
            stroke-dasharray: 8;
            stroke-dashoffset: 8;
            animation: a-line-draw 0.2s forwards;
            animation-delay: 0.6s;
          }
          @keyframes a-line-draw {
            to { stroke-dashoffset: 0; }
          }

          .a-dot {
            stroke-dasharray: 2;
            stroke-dashoffset: 2;
            animation: a-dot-draw 0.2s forwards;
            animation-delay: 0.8s;
          }
          @keyframes a-dot-draw {
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </svg>
  );
}
