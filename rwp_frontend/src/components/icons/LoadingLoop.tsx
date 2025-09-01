// rwp_frontend/src/components/icons/LoadingLoop.tsx
// 加载循环图标，可选动画
// Icon from Material Line Icons by Vjacheslav Trushkin
// https://github.com/cyberalien/line-md/blob/master/license.txt

export interface LoadingLoopProps {
  className?: string;
  animated?: boolean;
}

export default function LoadingLoop({
  className,
  animated = true,
}: LoadingLoopProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="false"
      role="img"
      data-animated={animated ? 'true' : 'false'}
      class={`icon${className ? ` ${className}` : ''}`}
//      style={style}
    >
      <title>Loading Loop Icon</title>
      <g class="ldg-rotor">
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

      <style>
        {`
          .ldg-arc { stroke-dasharray: 16; stroke-dashoffset: 0; }

          [data-animated="true"] .ldg-arc {
            stroke-dashoffset: 16;
            animation: ldg-draw 0.2s forwards;
          }
          @keyframes ldg-draw { to { stroke-dashoffset: 0; } }

          [data-animated="true"] .ldg-rotor {
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
