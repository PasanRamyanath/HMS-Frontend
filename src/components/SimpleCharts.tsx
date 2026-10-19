import { useId } from "react";

/**
 * Mathematical 2D Point structure.
 */
export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Data series entry for Area and Line charts.
 */
export interface AreaChartDataPoint {
  readonly label: string;
  readonly value: number;
  readonly secondaryValue?: number | undefined;
}

/**
 * Single Activity Ring item specification.
 */
export interface ActivityRingItem {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly colorFrom: string;
  readonly colorTo: string;
  readonly trackColor?: string | undefined;
}

/**
 * Horizontal Bar Chart data item.
 */
export interface BarChartItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly formattedValue?: string | undefined;
  readonly sublabel?: string | undefined;
  readonly colorFrom?: string | undefined;
  readonly colorTo?: string | undefined;
}

/**
 * Calculates circumference, clamped offset, and percentage for an Activity Ring.
 */
export function calculateActivityRing(
  value: number,
  max: number,
  radius: number,
): { circumference: number; offset: number; percentage: number } {
  const safeMax = max > 0 ? max : 1;
  const clampedRatio = Math.min(Math.max(value / safeMax, 0), 1);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clampedRatio);
  const percentage = Math.round(clampedRatio * 100);

  return { circumference, offset, percentage };
}

/**
 * Normalizes an array of raw values into scaled SVG points (x, y).
 */
export function normalizeDataPoints(
  data: readonly AreaChartDataPoint[],
  chartWidth: number,
  chartHeight: number,
  padding = { top: 16, bottom: 24, left: 16, right: 16 },
): readonly ChartPoint[] {
  if (data.length === 0) return [];

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin > 0 ? rawMax - rawMin : 1;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  return data.map((point, index) => {
    const x = Math.round((padding.left + index * stepX) * 100) / 100;
    const normalizedY = (point.value - rawMin) / range;
    const y = Math.round((padding.top + innerHeight * (1 - normalizedY)) * 100) / 100;
    return { x, y };
  });
}

/**
 * Generates an Apple Stocks-style smooth Cardinal/Hermite Bezier curve SVG path.
 */
export function buildSmoothBezierPath(points: readonly ChartPoint[], tension = 0.2): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  if (points.length === 1) return `M ${first.x} ${first.y}`;
  if (points.length === 2) {
    const second = points[1];
    return second ? `M ${first.x} ${first.y} L ${second.x} ${second.y}` : "";
  }

  let path = `M ${first.x} ${first.y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;

    const prevPrev = points[i - 2] ?? prev;
    const next = points[i + 1] ?? curr;

    const cp1x = prev.x + (curr.x - prevPrev.x) * tension;
    const cp1y = prev.y + (curr.y - prevPrev.y) * tension;
    const cp2x = curr.x - (next.x - prev.x) * tension;
    const cp2y = curr.y - (next.y - prev.y) * tension;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  return path;
}

/**
 * Closes a Bezier line path to form a complete filled area under the curve.
 */
export function buildClosedAreaPath(
  linePath: string,
  points: readonly ChartPoint[],
  bottomY: number,
): string {
  if (points.length === 0 || !linePath) return "";
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";

  return `${linePath} L ${last.x.toFixed(2)} ${bottomY.toFixed(2)} L ${first.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
}

// ============================================================================
// 1. Single Occupancy Activity Ring Component
// ============================================================================

export interface ActivityRingProps {
  readonly value: number;
  readonly max?: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly label?: string;
  readonly sublabel?: string;
  readonly colorFrom?: string;
  readonly colorTo?: string;
  readonly trackColor?: string;
  readonly ariaLabel?: string;
}

export function ActivityRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 12,
  label = "Occupancy",
  sublabel,
  colorFrom = "#007aff",
  colorTo = "#34c759",
  trackColor = "rgba(0, 0, 0, 0.08)",
  ariaLabel,
}: ActivityRingProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const { circumference, offset, percentage } = calculateActivityRing(value, max, radius);

  const titleText = ariaLabel ?? `${label}: ${percentage}%`;

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          role="img"
          aria-label={titleText}
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <title>{titleText}</title>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            className="dark:stroke-white/10"
          />

          {/* Active Gradient Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-apple-spring"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
            {percentage}%
          </span>
          {sublabel && (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 max-w-[80px] truncate">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// 2. Multi-Concentric Activity Rings (Apple Watch Fitness Style)
// ============================================================================

export interface MultiActivityRingsProps {
  readonly rings: readonly ActivityRingItem[];
  readonly size?: number;
  readonly ringWidth?: number;
  readonly ringGap?: number;
  readonly ariaLabel?: string;
}

export function MultiActivityRings({
  rings,
  size = 140,
  ringWidth = 10,
  ringGap = 4,
  ariaLabel = "Hotel Operational Metrics Rings",
}: MultiActivityRingsProps) {
  const baseId = useId();
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        role="img"
        aria-label={ariaLabel}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <title>{ariaLabel}</title>
        <defs>
          {rings.map((ring, idx) => (
            <linearGradient
              key={`grad-${ring.label}`}
              id={`${baseId}-grad-${idx}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={ring.colorFrom} />
              <stop offset="100%" stopColor={ring.colorTo} />
            </linearGradient>
          ))}
        </defs>

        {rings.map((ring, idx) => {
          const radius = center - ringWidth / 2 - idx * (ringWidth + ringGap);
          if (radius <= 0) return null;

          const { circumference, offset } = calculateActivityRing(ring.value, ring.max, radius);
          const track = ring.trackColor ?? "rgba(0, 0, 0, 0.08)";

          return (
            <g key={`ring-${ring.label}`}>
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={track}
                strokeWidth={ringWidth}
                className="dark:stroke-white/10"
              />
              {/* Foreground Gradient Arc */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={`url(#${baseId}-grad-${idx})`}
                strokeWidth={ringWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-apple-spring"
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-[220px]">
        {rings.map((ring) => {
          const ratio = Math.round(Math.min(Math.max(ring.value / ring.max, 0), 1) * 100);
          return (
            <div
              key={`legend-${ring.label}`}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ring.colorFrom }}
              />
              <span className="font-medium">{ring.label}</span>
              <span className="font-semibold tabular-nums-lkr text-slate-800 dark:text-white">
                {ratio}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 3. Apple Stocks-Inspired Pure SVG Bezier Area Chart
// ============================================================================

export interface RevenueTrendAreaChartProps {
  readonly data: readonly AreaChartDataPoint[];
  readonly height?: number;
  readonly width?: number;
  readonly colorFrom?: string;
  readonly colorTo?: string;
  readonly formatValue?: (val: number) => string;
  readonly showGrid?: boolean;
  readonly ariaLabel?: string;
}

export function RevenueTrendAreaChart({
  data,
  height = 160,
  width = 460,
  colorFrom = "#007aff",
  colorTo = "#30b0c7",
  formatValue,
  showGrid = true,
  ariaLabel = "Revenue Trend Analytics Chart",
}: RevenueTrendAreaChartProps) {
  const gradientId = useId();
  const padding = { top: 20, bottom: 30, left: 24, right: 24 };

  const points = normalizeDataPoints(data, width, height, padding);
  const linePath = buildSmoothBezierPath(points);
  const bottomY = height - padding.bottom;
  const areaPath = buildClosedAreaPath(linePath, points, bottomY);

  const rawValues = data.map((d) => d.value);
  const maxVal = rawValues.length > 0 ? Math.max(...rawValues) : 0;
  const minVal = rawValues.length > 0 ? Math.min(...rawValues) : 0;

  return (
    <div className="w-full">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <title>{ariaLabel}</title>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} stopOpacity={0.35} />
            <stop offset="85%" stopColor={colorTo} stopOpacity={0.03} />
            <stop offset="100%" stopColor={colorTo} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Subtle Horizontal Gridlines */}
        {showGrid && (
          <g className="stroke-slate-200/60 dark:stroke-white/10" strokeDasharray="3 3">
            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} />
            <line
              x1={padding.left}
              y1={(padding.top + bottomY) / 2}
              x2={width - padding.right}
              y2={(padding.top + bottomY) / 2}
            />
            <line x1={padding.left} y1={bottomY} x2={width - padding.right} y2={bottomY} />
          </g>
        )}

        {/* Filled Translucent Area */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            className="transition-all duration-500 ease-apple-smooth"
          />
        )}

        {/* Smooth Cubic Bezier Stroke */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={colorFrom}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-apple-smooth"
          />
        )}

        {/* Highlight points for each node */}
        {points.map((pt, idx) => {
          const dp = data[idx];
          if (!dp) return null;
          return (
            <circle
              key={`node-${dp.label}`}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="white"
              stroke={colorFrom}
              strokeWidth={2}
              className="dark:fill-slate-900"
            />
          );
        })}

        {/* X-Axis Data Labels */}
        {points.map((pt, idx) => {
          const dp = data[idx];
          if (!dp) return null;
          return (
            <text
              key={`lbl-${dp.label}`}
              x={pt.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-medium fill-slate-500 dark:fill-slate-400 select-none"
            >
              {dp.label}
            </text>
          );
        })}
      </svg>

      {/* Footer Min/Max Summary */}
      {formatValue && rawValues.length > 0 && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 px-2 mt-1 tabular-nums-lkr">
          <span>Min: {formatValue(minVal)}</span>
          <span>Peak: {formatValue(maxVal)}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. Apple Pure SVG Horizontal Bar Chart (Top Dishes / Revenue Outlets)
// ============================================================================

export interface HorizontalBarChartProps {
  readonly items: readonly BarChartItem[];
  readonly max?: number;
  readonly barHeight?: number;
  readonly rowGap?: number;
  readonly ariaLabel?: string;
}

export function HorizontalBarChart({
  items,
  max,
  barHeight = 10,
  rowGap = 24,
  ariaLabel = "Top Dishes and Outlets Performance Breakdown",
}: HorizontalBarChartProps) {
  const baseId = useId();
  const calculatedMax = max ?? (items.length > 0 ? Math.max(...items.map((i) => i.value), 1) : 1);

  const totalHeight = items.length * (barHeight + rowGap) + 16;
  const viewBoxWidth = 420;

  return (
    <div className="w-full">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${viewBoxWidth} ${totalHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <title>{ariaLabel}</title>
        <defs>
          {items.map((item, idx) => {
            const from = item.colorFrom ?? "#007aff";
            const to = item.colorTo ?? "#30b0c7";
            return (
              <linearGradient
                key={`bar-grad-${item.id}`}
                id={`${baseId}-bar-${idx}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            );
          })}
        </defs>

        {items.map((item, idx) => {
          const y = idx * (barHeight + rowGap) + 16;
          const ratio = Math.min(Math.max(item.value / calculatedMax, 0), 1);
          const barWidth = Math.max(Math.round(ratio * viewBoxWidth), 4);
          const displayVal = item.formattedValue ?? `${item.value}`;

          return (
            <g key={item.id}>
              {/* Row Label (Left) and Formatted Value (Right) */}
              <text
                x={0}
                y={y - 5}
                className="text-xs font-medium fill-slate-700 dark:fill-slate-200"
              >
                {item.label}
                {item.sublabel && ` (${item.sublabel})`}
              </text>
              <text
                x={viewBoxWidth}
                y={y - 5}
                textAnchor="end"
                className="text-xs font-semibold tabular-nums-lkr fill-slate-900 dark:fill-white"
              >
                {displayVal}
              </text>

              {/* Background Track */}
              <rect
                x={0}
                y={y}
                width={viewBoxWidth}
                height={barHeight}
                rx={barHeight / 2}
                ry={barHeight / 2}
                className="fill-slate-200/60 dark:fill-white/10"
              />

              {/* Foreground Gradient Pill Bar */}
              <rect
                x={0}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={barHeight / 2}
                ry={barHeight / 2}
                fill={`url(#${baseId}-bar-${idx})`}
                className="transition-all duration-700 ease-apple-spring"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
