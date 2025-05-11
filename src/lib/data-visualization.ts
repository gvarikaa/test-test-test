import { TokenUsageStats } from './token-management';

/**
 * Data visualization types
 */
export enum VisualizationType {
  BAR_CHART = 'bar-chart',
  LINE_CHART = 'line-chart',
  PIE_CHART = 'pie-chart',
  AREA_CHART = 'area-chart',
  SCATTER_PLOT = 'scatter-plot',
  HEATMAP = 'heatmap',
  RADAR_CHART = 'radar-chart',
  GAUGE = 'gauge',
  TABLE = 'table',
  CARD = 'card',
}

/**
 * Chart color palettes
 */
export enum ColorPalette {
  DEFAULT = 'default',
  ANALYTICS = 'analytics',
  CATEGORICAL = 'categorical',
  SEQUENTIAL = 'sequential',
  DIVERGING = 'diverging',
  MONOCHROME = 'monochrome',
}

/**
 * Color palette definitions
 */
export const COLOR_PALETTES = {
  [ColorPalette.DEFAULT]: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  [ColorPalette.ANALYTICS]: ['#2563eb', '#0891b2', '#059669', '#84cc16', '#f59e0b', '#dc2626'],
  [ColorPalette.CATEGORICAL]: ['#60a5fa', '#34d399', '#fcd34d', '#f87171', '#a78bfa', '#f472b6'],
  [ColorPalette.SEQUENTIAL]: ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
  [ColorPalette.DIVERGING]: ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#0ea5e9'],
  [ColorPalette.MONOCHROME]: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280'],
};

/**
 * Chart size options
 */
export enum ChartSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  CUSTOM = 'custom',
}

/**
 * Chart size definitions in pixels
 */
export const CHART_SIZES = {
  [ChartSize.SMALL]: { width: 300, height: 200 },
  [ChartSize.MEDIUM]: { width: 500, height: 300 },
  [ChartSize.LARGE]: { width: 800, height: 400 },
};

/**
 * Data point interface for visualization
 */
export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  tooltip?: string;
  metadata?: Record<string, any>;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint extends DataPoint {
  timestamp: Date | string;
}

/**
 * Multi-series data point for grouped visualizations
 */
export interface MultiSeriesData {
  seriesName: string;
  color?: string;
  data: DataPoint[];
}

/**
 * Time series multi-series data
 */
export interface TimeSeriesMultiData {
  seriesName: string;
  color?: string;
  data: TimeSeriesDataPoint[];
}

/**
 * Chart options interface
 */
export interface ChartOptions {
  title?: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  legendPosition?: 'top' | 'right' | 'bottom' | 'left' | 'none';
  palette?: ColorPalette;
  size?: ChartSize | { width: number; height: number };
  showValues?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  enableAnimation?: boolean;
  animationDuration?: number;
  customCss?: string;
  stacked?: boolean;
  maxItems?: number;
  sortBy?: 'value' | 'label' | 'timestamp';
  sortDirection?: 'asc' | 'desc';
  tooltipFormat?: (point: DataPoint) => string;
  valueFormat?: (value: number) => string;
  dateFormat?: (date: Date | string) => string;
  responsive?: boolean;
  aspectRatio?: number;
  darkMode?: boolean;
}

/**
 * Generic chart data interface
 */
export interface ChartData<T = DataPoint> {
  data: T[];
  options?: ChartOptions;
}

/**
 * Multi-series chart data
 */
export interface MultiSeriesChartData {
  data: MultiSeriesData[];
  options?: ChartOptions;
}

/**
 * Time series chart data
 */
export interface TimeSeriesChartData {
  data: TimeSeriesDataPoint[];
  options?: ChartOptions;
}

/**
 * Time series multi-series chart data
 */
export interface TimeSeriesMultiChartData {
  data: TimeSeriesMultiData[];
  options?: ChartOptions;
}

/**
 * CSS styles for visualization
 */
interface VisualizationStyles {
  container: string;
  title: string;
  subtitle: string;
  chart: string;
  legend: string;
  tooltip: string;
  xAxis: string;
  yAxis: string;
  grid: string;
  bar: string;
  line: string;
  point: string;
  area: string;
  pie: string;
  slice: string;
  gauge: string;
  radar: string;
  heatmap: string;
}

/**
 * Default visualization styles
 */
export const DEFAULT_STYLES: VisualizationStyles = {
  container: 'w-full h-full flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg shadow',
  title: 'text-lg font-semibold text-gray-900 dark:text-white mb-1',
  subtitle: 'text-sm text-gray-500 dark:text-gray-400 mb-4',
  chart: 'flex-1 w-full',
  legend: 'flex flex-wrap gap-2 mt-4 justify-center',
  tooltip: 'absolute z-10 px-2 py-1 text-xs bg-gray-900 text-white rounded pointer-events-none transform -translate-x-1/2 -translate-y-full',
  xAxis: 'flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2',
  yAxis: 'flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 h-full',
  grid: 'w-full h-full border-b border-l border-gray-200 dark:border-gray-700',
  bar: 'rounded-t transition-all duration-300 hover:opacity-80',
  line: 'stroke-2 fill-none transition-all duration-300',
  point: 'r-3 transition-all duration-300 hover:r-4',
  area: 'opacity-20 transition-all duration-300',
  pie: 'w-full h-full',
  slice: 'transition-all duration-300 hover:opacity-80',
  gauge: 'w-full h-full',
  radar: 'w-full h-full',
  heatmap: 'w-full h-full',
};

/**
 * Generate CSS styles for a visualization based on options
 */
export function generateVisualizationStyles(
  type: VisualizationType,
  options?: ChartOptions
): VisualizationStyles {
  const darkMode = options?.darkMode ?? false;
  const styles = { ...DEFAULT_STYLES };

  // Adjust styles based on chart size
  if (options?.size) {
    if (typeof options.size === 'object') {
      styles.container = `${styles.container} w-[${options.size.width}px] h-[${options.size.height}px]`;
    } else {
      switch (options.size) {
        case ChartSize.SMALL:
          styles.title = 'text-md font-semibold text-gray-900 dark:text-white mb-1';
          styles.subtitle = 'text-xs text-gray-500 dark:text-gray-400 mb-2';
          break;
        case ChartSize.LARGE:
          styles.title = 'text-xl font-bold text-gray-900 dark:text-white mb-2';
          styles.subtitle = 'text-md text-gray-500 dark:text-gray-400 mb-4';
          break;
      }
    }
  }

  // Adjust styles based on chart type
  switch (type) {
    case VisualizationType.BAR_CHART:
      if (options?.stacked) {
        styles.chart = `${styles.chart} flex items-end space-x-1`;
      } else {
        styles.chart = `${styles.chart} flex items-end space-x-2`;
      }
      break;
    case VisualizationType.LINE_CHART:
      styles.chart = `${styles.chart} relative`;
      break;
    case VisualizationType.PIE_CHART:
      styles.chart = `${styles.chart} relative`;
      break;
    case VisualizationType.RADAR_CHART:
      styles.chart = `${styles.chart} relative`;
      break;
    case VisualizationType.GAUGE:
      styles.chart = `${styles.chart} relative`;
      break;
    case VisualizationType.HEATMAP:
      styles.chart = `${styles.chart} grid`;
      break;
  }

  // Add responsive styles if needed
  if (options?.responsive) {
    styles.container = `${styles.container} max-w-full`;
    if (options.aspectRatio) {
      styles.chart = `${styles.chart} aspect-[${options.aspectRatio}]`;
    }
  }

  // Add custom CSS if provided
  if (options?.customCss) {
    styles.container = `${styles.container} ${options.customCss}`;
  }

  return styles;
}

/**
 * Format number with appropriate suffix (K, M, B)
 */
export function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

/**
 * Format date for display in charts
 */
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    case 'long':
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    case 'medium':
    default:
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Generate a color from a palette based on index
 */
export function getColorFromPalette(palette: ColorPalette, index: number): string {
  const colors = COLOR_PALETTES[palette] || COLOR_PALETTES[ColorPalette.DEFAULT];
  return colors[index % colors.length];
}

/**
 * Generate random but visually appealing colors
 */
export function generateRandomColor(seed?: string): string {
  if (seed) {
    // Generate deterministic color from seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash % 360);
    const s = 50 + Math.abs((hash >> 8) % 30); // 50-80%
    const l = 40 + Math.abs((hash >> 16) % 20); // 40-60%
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  
  // Fully random color with good saturation and lightness
  const h = Math.floor(Math.random() * 360);
  const s = 50 + Math.floor(Math.random() * 30); // 50-80%
  const l = 40 + Math.floor(Math.random() * 20); // 40-60%
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Process and normalize data for visualization
 */
export function processChartData<T extends DataPoint>(
  data: T[],
  options?: ChartOptions
): T[] {
  let processedData = [...data];
  
  // Sort data if requested
  if (options?.sortBy) {
    processedData.sort((a, b) => {
      if (options.sortBy === 'value') {
        return options.sortDirection === 'desc' ? b.value - a.value : a.value - b.value;
      } else if (options.sortBy === 'label') {
        return options.sortDirection === 'desc' 
          ? b.label.localeCompare(a.label) 
          : a.label.localeCompare(b.label);
      } else if (options.sortBy === 'timestamp' && 'timestamp' in a && 'timestamp' in b) {
        const aTime = new Date(a.timestamp as any).getTime();
        const bTime = new Date(b.timestamp as any).getTime();
        return options.sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
      }
      return 0;
    });
  }
  
  // Limit items if requested
  if (options?.maxItems && options.maxItems > 0 && processedData.length > options.maxItems) {
    if (options.sortBy === 'value' && options.sortDirection === 'desc') {
      // Keep top N items, consolidate the rest as "Other"
      const topItems = processedData.slice(0, options.maxItems - 1);
      const otherItems = processedData.slice(options.maxItems - 1);
      
      if (otherItems.length > 0) {
        const otherValue = otherItems.reduce((sum, item) => sum + item.value, 0);
        const otherItem = {
          label: 'Other',
          value: otherValue,
          color: '#9ca3af', // Gray color for "Other"
        } as T;
        
        processedData = [...topItems, otherItem];
      }
    } else {
      // Just take the first N items
      processedData = processedData.slice(0, options.maxItems);
    }
  }
  
  // Assign colors if not already assigned
  processedData.forEach((item, index) => {
    if (!item.color) {
      item.color = getColorFromPalette(
        options?.palette || ColorPalette.DEFAULT,
        index
      );
    }
  });
  
  return processedData;
}

/**
 * Generate CSS for rendering a bar chart
 */
export function generateBarChartCss(
  data: DataPoint[],
  options?: ChartOptions
): string {
  const maxValue = Math.max(...data.map(item => item.value), 0);
  const numBars = data.length;
  const barWidth = Math.max(Math.min(100 / numBars - 2, 25), 4); // Between 4% and 25%, with 2% gap
  
  return `
    .bar-chart-container {
      display: flex;
      align-items: flex-end;
      height: 100%;
      width: 100%;
      gap: 2px;
    }
    
    .bar-chart-bar {
      flex: 0 0 ${barWidth}%;
      position: relative;
      transition: opacity 0.2s;
    }
    
    .bar-chart-bar:hover {
      opacity: 0.8;
    }
    
    .bar-chart-bar::before {
      content: attr(data-value);
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #6b7280;
      ${options?.darkMode ? 'color: #9ca3af;' : ''}
    }
    
    .bar-chart-bar::after {
      content: attr(data-label);
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      color: #6b7280;
      ${options?.darkMode ? 'color: #9ca3af;' : ''}
    }
    
    .bar-chart-bar-inner {
      width: 100%;
      border-radius: 2px 2px 0 0;
      ${options?.enableAnimation ? 'transition: height 1s ease-out;' : ''}
    }
  `;
}

/**
 * Generate CSS for rendering a pie chart
 */
export function generatePieChartCss(
  data: DataPoint[],
  options?: ChartOptions
): string {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  let cssString = `
    .pie-chart-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .pie-chart {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(
  `;
  
  let currentAngle = 0;
  data.forEach((item) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    cssString += `${item.color} ${startAngle}deg ${endAngle}deg${endAngle < 360 ? ',' : ''}`;
    
    currentAngle = endAngle;
  });
  
  cssString += `
      );
    }
    
    .pie-chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 16px;
      font-size: 12px;
    }
    
    .pie-chart-legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .pie-chart-legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    
    .pie-chart-tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      transform: translate(-50%, -100%);
      opacity: 0;
      transition: opacity 0.2s;
    }
  `;
  
  return cssString;
}

/**
 * Generate CSS for rendering a line chart
 */
export function generateLineChartCss(
  data: TimeSeriesDataPoint[],
  options?: ChartOptions
): string {
  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });
  
  const maxValue = Math.max(...sortedData.map(item => item.value), 0);
  const minValue = Math.min(...sortedData.map(item => item.value), 0);
  const range = maxValue - minValue;
  
  return `
    .line-chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      padding-bottom: 30px;
      padding-left: 30px;
    }
    
    .line-chart-line {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      ${options?.enableAnimation ? 'transition: stroke-dashoffset 1s ease-out;' : ''}
    }
    
    .line-chart-area {
      opacity: 0.2;
      ${options?.enableAnimation ? 'transition: opacity 1s ease-out;' : ''}
    }
    
    .line-chart-point {
      r: 3;
      transition: r 0.2s;
    }
    
    .line-chart-point:hover {
      r: 5;
    }
    
    .line-chart-x-axis {
      position: absolute;
      bottom: 0;
      left: 30px;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
      ${options?.darkMode ? 'color: #9ca3af;' : ''}
    }
    
    .line-chart-y-axis {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 30px;
      width: 30px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #6b7280;
      ${options?.darkMode ? 'color: #9ca3af;' : ''}
    }
    
    .line-chart-grid {
      position: absolute;
      top: 0;
      left: 30px;
      right: 0;
      bottom: 30px;
      pointer-events: none;
      stroke: #e5e7eb;
      ${options?.darkMode ? 'stroke: #374151;' : ''}
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }
    
    .line-chart-tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      transform: translate(-50%, -100%);
      opacity: 0;
      transition: opacity 0.2s;
    }
  `;
}

/**
 * Generate data attributes for HTML-based visualizations
 */
export function generateDataAttributes(data: DataPoint[]): string[] {
  return data.map(item => {
    const attributes = [
      `data-label="${item.label}"`,
      `data-value="${item.value}"`,
      `data-color="${item.color}"`,
    ];
    
    if (item.tooltip) {
      attributes.push(`data-tooltip="${item.tooltip}"`);
    }
    
    if (item.metadata) {
      Object.entries(item.metadata).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          attributes.push(`data-${key}="${value}"`);
        }
      });
    }
    
    return attributes.join(' ');
  });
}

/**
 * Convert token usage stats into visualization data
 * @param stats TokenUsageStats from token-management.ts
 * @param options Visualization options
 */
export function generateTokenUsageChartData(
  stats: TokenUsageStats,
  options?: ChartOptions
): ChartData {
  // Create data points for usage by model
  const modelUsageData: DataPoint[] = Object.entries(stats.byModel).map(([model, count], index) => ({
    label: model,
    value: count,
    color: getColorFromPalette(options?.palette || ColorPalette.DEFAULT, index),
    tooltip: `${model}: ${count} tokens (${Math.round((count / stats.totalTokens) * 100)}%)`,
  }));

  return {
    data: processChartData(modelUsageData, options),
    options: {
      title: 'Token Usage by Model',
      subtitle: `Total: ${formatNumber(stats.totalTokens)} tokens`,
      showValues: true,
      showLegend: true,
      ...options,
    },
  };
}

/**
 * Generate time series data for token usage over time
 */
export function generateTokenUsageTimeSeriesData(
  stats: TokenUsageStats,
  options?: ChartOptions
): TimeSeriesChartData {
  // Create time series data points
  const timeSeriesData: TimeSeriesDataPoint[] = stats.byDay.map((day, index) => ({
    label: formatDate(day.date, 'short'),
    value: day.tokens,
    timestamp: day.date,
    color: getColorFromPalette(options?.palette || ColorPalette.DEFAULT, 0),
    tooltip: `${formatDate(day.date, 'medium')}: ${formatNumber(day.tokens)} tokens`,
  }));

  return {
    data: processChartData(timeSeriesData, {
      sortBy: 'timestamp',
      sortDirection: 'asc',
      ...options,
    }) as TimeSeriesDataPoint[],
    options: {
      title: 'Token Usage Over Time',
      subtitle: `Last ${timeSeriesData.length} days`,
      showValues: false,
      showGrid: true,
      xAxisLabel: 'Date',
      yAxisLabel: 'Tokens',
      ...options,
    },
  };
}

/**
 * Generate data for feature usage visualization
 */
export function generateFeatureUsageData(
  stats: TokenUsageStats,
  options?: ChartOptions
): ChartData {
  // Create data points for usage by feature
  const featureUsageData: DataPoint[] = Object.entries(stats.byFeature).map(([feature, count], index) => ({
    label: feature,
    value: count,
    color: getColorFromPalette(options?.palette || ColorPalette.DEFAULT, index),
    tooltip: `${feature}: ${count} tokens (${Math.round((count / stats.totalTokens) * 100)}%)`,
  }));

  return {
    data: processChartData(featureUsageData, {
      sortBy: 'value',
      sortDirection: 'desc',
      maxItems: 5, // Only show top 5 features
      ...options
    }),
    options: {
      title: 'Token Usage by Feature',
      subtitle: `Top ${Math.min(5, featureUsageData.length)} features`,
      showValues: true,
      showLegend: true,
      ...options,
    },
  };
}

/**
 * Generate gauge data for token usage percentage
 */
export function generateTokenUsageGaugeData(
  used: number,
  total: number,
  options?: ChartOptions
): ChartData {
  const percentage = Math.min(Math.round((used / total) * 100), 100);
  let color = '#10b981'; // Green for low usage
  
  if (percentage > 90) {
    color = '#ef4444'; // Red for high usage
  } else if (percentage > 70) {
    color = '#f59e0b'; // Yellow for medium usage
  }
  
  return {
    data: [{
      label: 'Token Usage',
      value: percentage,
      color,
      tooltip: `${percentage}% of your token limit used (${formatNumber(used)}/${formatNumber(total)})`,
    }],
    options: {
      title: 'Token Usage',
      subtitle: `${formatNumber(used)} of ${formatNumber(total)} tokens used`,
      ...options,
    },
  };
}

/**
 * Generate a benchmark comparison visualization
 */
export function generateBenchmarkData(
  value: number,
  benchmark: number,
  label: string,
  options?: ChartOptions
): ChartData {
  const percentage = Math.round((value / benchmark) * 100);
  let color = '#10b981'; // Green for good
  let comparison = 'lower';
  
  if (percentage > 100) {
    color = '#ef4444'; // Red for bad
    comparison = 'higher';
  } else if (percentage > 90) {
    color = '#f59e0b'; // Yellow for warning
    comparison = 'similar';
  }
  
  return {
    data: [{
      label,
      value: percentage,
      color,
      tooltip: `${percentage}% compared to benchmark (${formatNumber(value)} vs ${formatNumber(benchmark)})`,
      metadata: {
        actual: value,
        benchmark,
        comparison,
      },
    }],
    options: {
      title: `${label} Benchmark`,
      subtitle: `${percentage}% ${comparison} than average`,
      ...options,
    },
  };
}

/**
 * Generate a multi-metric dashboard of visualizations
 */
export function generateMetricsDashboard(
  stats: TokenUsageStats,
  tokenLimit: number,
  options?: ChartOptions
): Record<string, ChartData | TimeSeriesChartData> {
  return {
    usageGauge: generateTokenUsageGaugeData(stats.totalTokens, tokenLimit, options),
    modelUsage: generateTokenUsageChartData(stats, options),
    timeSeriesUsage: generateTokenUsageTimeSeriesData(stats, options),
    featureUsage: generateFeatureUsageData(stats, options),
  };
}