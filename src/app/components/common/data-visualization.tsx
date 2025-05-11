'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { BarChart, LineChart, PieChart, GaugeChart, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import {
  ChartData,
  TimeSeriesChartData,
  VisualizationType,
  ChartOptions,
  DataPoint,
  TimeSeriesDataPoint,
  generateDataAttributes,
  generateBarChartCss,
  generatePieChartCss,
  generateLineChartCss,
  formatNumber,
  formatDate,
  CHART_SIZES,
  ChartSize,
} from '@/lib/data-visualization';

/**
 * Props for DataVisualization component
 */
interface DataVisualizationProps {
  type: VisualizationType;
  data: ChartData | TimeSeriesChartData;
  className?: string;
  onSelect?: (point: DataPoint) => void;
}

/**
 * Data Visualization Component
 * Renders various chart types based on provided data
 */
export default function DataVisualization({
  type,
  data,
  className = '',
  onSelect,
}: DataVisualizationProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<DataPoint | null>(null);

  // Apply theme-based styling
  const isDarkMode = theme === 'dark';
  const mergedOptions: ChartOptions = {
    ...data.options,
    darkMode: isDarkMode,
  };

  // Set up mounted state for theme detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle container size
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setContainerSize({ width, height });
      
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      
      resizeObserver.observe(containerRef.current);
      
      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, [containerRef.current, mounted]);

  // Handle tooltip positioning
  const showTooltip = (e: React.MouseEvent, item: DataPoint) => {
    if (tooltipRef.current && containerRef.current) {
      setActiveItem(item);
      const tooltipEl = tooltipRef.current;
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      
      tooltipEl.style.left = `${x}px`;
      tooltipEl.style.top = `${y}px`;
      tooltipEl.style.opacity = '1';
    }
  };
  
  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = '0';
      setActiveItem(null);
    }
  };

  // Get chart dimensions based on options or container
  const getChartSize = () => {
    const { size = ChartSize.MEDIUM } = mergedOptions;
    
    if (typeof size === 'object') {
      return size;
    }
    
    if (mergedOptions.responsive && containerSize.width > 0) {
      const aspectRatio = mergedOptions.aspectRatio || 16/9;
      return {
        width: containerSize.width,
        height: containerSize.width / aspectRatio,
      };
    }
    
    return CHART_SIZES[size as ChartSize];
  };

  // Render empty state when no data
  if (!data.data || data.data.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 border rounded-md bg-gray-50 dark:bg-gray-800 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  // Render style tag with chart-specific CSS
  const renderStyleSheet = () => {
    let cssContent = '';
    
    switch (type) {
      case VisualizationType.BAR_CHART:
        cssContent = generateBarChartCss(data.data as DataPoint[], mergedOptions);
        break;
      case VisualizationType.PIE_CHART:
        cssContent = generatePieChartCss(data.data as DataPoint[], mergedOptions);
        break;
      case VisualizationType.LINE_CHART:
        cssContent = generateLineChartCss(data.data as TimeSeriesDataPoint[], mergedOptions);
        break;
      default:
        break;
    }
    
    return <style dangerouslySetInnerHTML={{ __html: cssContent }} />;
  };

  // Render bar chart
  const renderBarChart = () => {
    const chartData = data.data as DataPoint[];
    const maxValue = Math.max(...chartData.map(item => item.value), 0);
    
    return (
      <div className="bar-chart-container">
        {chartData.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="bar-chart-bar"
            {...generateDataAttributes([item])[0]}
            onMouseMove={(e) => showTooltip(e, item)}
            onMouseLeave={hideTooltip}
            onClick={() => onSelect?.(item)}
          >
            <div
              className="bar-chart-bar-inner"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // Render pie chart
  const renderPieChart = () => {
    const chartData = data.data as DataPoint[];
    
    return (
      <div className="pie-chart-container">
        <div className="pie-chart" />
        
        {mergedOptions.showLegend !== false && (
          <div className="pie-chart-legend">
            {chartData.map((item, index) => (
              <div 
                key={`${item.label}-${index}`}
                className="pie-chart-legend-item"
                onMouseMove={(e) => showTooltip(e, item)}
                onMouseLeave={hideTooltip}
                onClick={() => onSelect?.(item)}
              >
                <div 
                  className="pie-chart-legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.label} {mergedOptions.showValues && `(${formatNumber(item.value)})`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render line chart
  const renderLineChart = () => {
    const chartData = data.data as TimeSeriesDataPoint[];
    // Sort data by timestamp
    const sortedData = [...chartData].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
    
    const maxValue = Math.max(...sortedData.map(item => item.value), 0);
    const minValue = Math.min(...sortedData.map(item => item.value), 0);
    const range = maxValue - minValue;
    
    // Create SVG paths
    const chartWidth = getChartSize().width - 40; // Adjust for axes
    const chartHeight = getChartSize().height - 40;
    const pointDistance = chartWidth / (sortedData.length - 1 || 1);
    
    // Create line path
    let linePath = '';
    let areaPath = '';
    
    sortedData.forEach((item, index) => {
      const x = index * pointDistance;
      const y = chartHeight - ((item.value - minValue) / (range || 1)) * chartHeight;
      
      if (index === 0) {
        linePath += `M${x},${y}`;
        areaPath += `M${x},${chartHeight} L${x},${y}`;
      } else {
        linePath += ` L${x},${y}`;
        areaPath += ` L${x},${y}`;
      }
      
      if (index === sortedData.length - 1) {
        areaPath += ` L${x},${chartHeight} Z`;
      }
    });
    
    return (
      <div className="line-chart-container">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Grid */}
          {mergedOptions.showGrid && (
            <g className="line-chart-grid">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={`h-${ratio}`}
                  x1="0"
                  y1={chartHeight * (1 - ratio)}
                  x2={chartWidth}
                  y2={chartHeight * (1 - ratio)}
                />
              ))}
              
              {/* Vertical grid lines */}
              {sortedData.map((_, index) => {
                if (index % Math.ceil(sortedData.length / 5) === 0 || index === sortedData.length - 1) {
                  return (
                    <line
                      key={`v-${index}`}
                      x1={index * pointDistance}
                      y1="0"
                      x2={index * pointDistance}
                      y2={chartHeight}
                    />
                  );
                }
                return null;
              })}
            </g>
          )}
          
          {/* Area fill */}
          <path
            className="line-chart-area"
            d={areaPath}
            fill={sortedData[0]?.color || '#3b82f6'}
          />
          
          {/* Line */}
          <path
            className="line-chart-line"
            d={linePath}
            stroke={sortedData[0]?.color || '#3b82f6'}
            strokeDasharray={chartWidth}
            strokeDashoffset={mergedOptions.enableAnimation ? chartWidth : 0}
            style={mergedOptions.enableAnimation ? { animation: 'dash 1s ease-in-out forwards' } : {}}
          />
          
          {/* Data points */}
          {sortedData.map((item, index) => {
            const x = index * pointDistance;
            const y = chartHeight - ((item.value - minValue) / (range || 1)) * chartHeight;
            
            return (
              <circle
                key={`point-${index}`}
                className="line-chart-point"
                cx={x}
                cy={y}
                fill={item.color || '#3b82f6'}
                onMouseMove={(e) => showTooltip(e, item)}
                onMouseLeave={hideTooltip}
                onClick={() => onSelect?.(item)}
              />
            );
          })}
        </svg>
        
        {/* X-Axis */}
        <div className="line-chart-x-axis">
          {sortedData.map((item, index) => {
            if (index % Math.ceil(sortedData.length / 5) === 0 || index === sortedData.length - 1) {
              return (
                <div key={`x-label-${index}`}>
                  {typeof item.timestamp === 'string' 
                    ? formatDate(item.timestamp, 'short')
                    : formatDate(item.timestamp, 'short')}
                </div>
              );
            }
            return null;
          })}
        </div>
        
        {/* Y-Axis */}
        <div className="line-chart-y-axis">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div key={`y-label-${ratio}`}>
              {formatNumber(minValue + range * ratio)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render gauge chart
  const renderGaugeChart = () => {
    const item = data.data[0] as DataPoint;
    const percentage = item.value;
    const color = item.color || '#3b82f6';
    const radius = 40;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - percentage / 100);
    
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
            />
            
            {/* Foreground circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 60 60)"
              style={{
                transition: 'stroke-dashoffset 1s ease-in-out',
              }}
            />
            
            {/* Percentage text */}
            <text
              x="60"
              y="65"
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill={isDarkMode ? '#e5e7eb' : '#1f2937'}
            >
              {percentage}%
            </text>
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {item.label}
          </div>
          {item.tooltip && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {item.tooltip}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render card with comparison indicator
  const renderComparisonCard = () => {
    const item = data.data[0] as DataPoint;
    const metadata = item.metadata || {};
    const comparison = metadata.comparison as string || 'similar';
    const actual = metadata.actual as number || 0;
    const benchmark = metadata.benchmark as number || 0;
    const percentage = item.value;
    const color = item.color || '#3b82f6';
    
    // Determine arrow type
    let Arrow = ArrowRight;
    if (comparison === 'higher') {
      Arrow = ArrowUpRight;
    } else if (comparison === 'lower') {
      Arrow = ArrowDownRight;
    }
    
    return (
      <div className="flex flex-col h-full rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {item.label}
        </div>
        
        <div className="flex items-end justify-between mt-2">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(actual)}
          </div>
          
          <div 
            className={`flex items-center text-sm font-medium`}
            style={{ color }}
          >
            <Arrow size={16} className="mr-1" /> {percentage}%
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Benchmark: {formatNumber(benchmark)}
        </div>
        
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color,
              transition: 'width 1s ease-in-out',
            }}
          />
        </div>
      </div>
    );
  };

  // Render table view
  const renderTable = () => {
    const chartData = data.data as DataPoint[];
    
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {mergedOptions.xAxisLabel || 'Label'}
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {mergedOptions.yAxisLabel || 'Value'}
              </th>
              {chartData[0]?.metadata && Object.keys(chartData[0].metadata)
                .filter(key => key !== 'comparison')
                .map(key => (
                  <th key={key} scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {key}
                  </th>
                ))
              }
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {chartData.map((item, index) => (
              <tr 
                key={`${item.label}-${index}`}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => onSelect?.(item)}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center">
                    <span 
                      className="h-3 w-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                  {formatNumber(item.value)}
                </td>
                {item.metadata && Object.entries(item.metadata)
                  .filter(([key]) => key !== 'comparison')
                  .map(([key, value]) => (
                    <td key={key} className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {typeof value === 'number' ? formatNumber(value) : value}
                    </td>
                  ))
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Main render function based on chart type
  const renderChart = () => {
    switch (type) {
      case VisualizationType.BAR_CHART:
        return renderBarChart();
      case VisualizationType.PIE_CHART:
        return renderPieChart();
      case VisualizationType.LINE_CHART:
        return renderLineChart();
      case VisualizationType.GAUGE:
        return renderGaugeChart();
      case VisualizationType.CARD:
        return renderComparisonCard();
      case VisualizationType.TABLE:
        return renderTable();
      default:
        return (
          <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400">
            Chart type not implemented
          </div>
        );
    }
  };

  // Determine chart icon
  const getChartIcon = () => {
    switch (type) {
      case VisualizationType.BAR_CHART:
        return <BarChart size={16} />;
      case VisualizationType.PIE_CHART:
        return <PieChart size={16} />;
      case VisualizationType.LINE_CHART:
        return <LineChart size={16} />;
      case VisualizationType.GAUGE:
        return <GaugeChart size={16} />;
      default:
        return null;
    }
  };

  // If theme hasn't mounted yet, render a placeholder to avoid flash
  if (!mounted) {
    return (
      <div 
        className={`w-full h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md ${className}`}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Render chart-specific CSS */}
      {renderStyleSheet()}
      
      {/* Chart Title */}
      {(mergedOptions.title || mergedOptions.subtitle) && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {mergedOptions.title && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mergedOptions.title}
              </h3>
              {getChartIcon()}
            </div>
          )}
          
          {mergedOptions.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mergedOptions.subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Chart Content */}
      <div 
        className="p-4" 
        style={{
          height: type !== VisualizationType.TABLE ? 
            `${getChartSize().height}px` : 'auto'
        }}
      >
        {renderChart()}
      </div>
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-10 px-2 py-1 text-xs bg-gray-900 text-white rounded pointer-events-none opacity-0 transition-opacity duration-200"
      >
        {activeItem?.tooltip || activeItem?.label}
      </div>
    </div>
  );
}

/**
 * Metrics Dashboard component
 * Renders a grid of visualizations for a comprehensive dashboard
 */
interface MetricsDashboardProps {
  metrics: Record<string, ChartData | TimeSeriesChartData>;
  className?: string;
}

export function MetricsDashboard({
  metrics,
  className = '',
}: MetricsDashboardProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Token Usage Gauge */}
      {metrics.usageGauge && (
        <DataVisualization
          type={VisualizationType.GAUGE}
          data={metrics.usageGauge}
        />
      )}
      
      {/* Model Usage Chart */}
      {metrics.modelUsage && (
        <DataVisualization
          type={VisualizationType.PIE_CHART}
          data={metrics.modelUsage}
        />
      )}
      
      {/* Time Series Usage Chart */}
      {metrics.timeSeriesUsage && (
        <DataVisualization
          type={VisualizationType.LINE_CHART}
          data={metrics.timeSeriesUsage}
          className="md:col-span-2"
        />
      )}
      
      {/* Feature Usage Chart */}
      {metrics.featureUsage && (
        <DataVisualization
          type={VisualizationType.BAR_CHART}
          data={metrics.featureUsage}
          className="md:col-span-2"
        />
      )}
      
      {/* Render any additional metrics */}
      {Object.entries(metrics)
        .filter(([key]) => !['usageGauge', 'modelUsage', 'timeSeriesUsage', 'featureUsage'].includes(key))
        .map(([key, data]) => (
          <DataVisualization
            key={key}
            type={VisualizationType.CARD}
            data={data}
          />
        ))
      }
    </div>
  );
}