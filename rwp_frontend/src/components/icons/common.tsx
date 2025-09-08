// rwp_frontend/src/components/icons/common.tsx


// 加载循环图标，可选动画
// Icon from Material Line Icons by Vjacheslav Trushkin
// https://github.com/cyberalien/line-md/blob/master/license.txt

interface LoadingLoopProps {
  className?: string;
  animated?: boolean;
}

export function iconLoadingLoop({
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

// 警告圆圈图标，可选动画
// Icon from Material Line Icons by Vjacheslav Trushkin
// https://github.com/cyberalien/line-md/blob/master/license.txt

interface AlertCircleProps {
  className?: string;
  animated?: boolean;
}

export function iconAlertCircle({
  className,
  animated = true,
}: AlertCircleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="false"
      role="img"
      data-animated={animated ? 'true' : 'false'}
      class={`icon${className ? ` ${className}` : ''}`}
    //      style={style}
    >
      <title>Alert Circle Icon</title>
      <g
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <path
          class="a-circle"
          d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z"
        />
        <path class="a-line" d="M12 7v6" />
        <path class="a-dot" d="M12 17v0.01" />
      </g>

      <style>
        {`
    .a-circle { stroke-dasharray: 64; stroke-dashoffset: 0; }
    .a-line   { stroke-dasharray: 8;  stroke-dashoffset: 0; }
    .a-dot    { stroke-dasharray: 2;  stroke-dashoffset: 0; }

    [data-animated="true"] .a-circle {
      stroke-dashoffset: 64;
      animation: a-circle-draw 0.6s forwards;
    }
    @keyframes a-circle-draw { to { stroke-dashoffset: 0; } }

    [data-animated="true"] .a-line {
      stroke-dashoffset: 8;
      stroke-opacity: 0;
      animation:
        a-line-draw 0.2s forwards 0.6s,
        a-stroke-in 0s   forwards 0.6s;
    }
    @keyframes a-line-draw { to { stroke-dashoffset: 0; } }

    [data-animated="true"] .a-dot {
      stroke-dashoffset: 2;
      stroke-opacity: 0;
      animation:
        a-dot-draw 0.2s forwards 0.8s,
        a-stroke-in 0s   forwards 0.8s;
    }
    @keyframes a-dot-draw { to { stroke-dashoffset: 0; } }

    @keyframes a-stroke-in { to { stroke-opacity: 1; } }
  `}
      </style>
    </svg>
  );
}
