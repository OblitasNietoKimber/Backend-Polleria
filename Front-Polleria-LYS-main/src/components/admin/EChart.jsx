import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export default function EChart({ option, className, ariaLabel }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    const chart = echarts.init(chartRef.current, null, { renderer: "canvas" });
    instanceRef.current = chart;

    const resizeChart = () => chart.resize();
    const observer = new ResizeObserver(resizeChart);
    observer.observe(chartRef.current);
    window.addEventListener("resize", resizeChart);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeChart);
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.setOption(option, true);
  }, [option]);

  return <div ref={chartRef} className={className} role="img" aria-label={ariaLabel} />;
}
