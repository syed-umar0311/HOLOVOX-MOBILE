import React from 'react';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';

interface RadarChartProps {
  axes: string[];
  now: number[];
  prev: number[];
  size?: number;
}

const getAxisLabel = (axis: string) => axis.split(' ')[0];

// Ported near-verbatim from src/Pages/enterprise/components/RadarChart.tsx — it was
// already plain SVG math with no DOM dependency, so react-native-svg's primitives
// (Svg/Polygon/Line/Text) map directly onto the web version's <svg>/<polygon>/<line>/<text>.
export function RadarChart({ axes, now, prev, size = 300 }: RadarChartProps) {
  const R = size * 0.22;
  const cx = size / 2;
  const cy = size * 0.5;
  const labelR = R * 1.3;
  const fontSize = Math.max(7, Math.min(10, Math.round(size * 0.0333)));

  const getPoints = (vals: number[]) =>
    vals
      .map((v, i) => {
        const a = (Math.PI * 2 * i) / vals.length - Math.PI / 2;
        return `${cx + Math.cos(a) * R * v},${cy + Math.sin(a) * R * v}`;
      })
      .join(' ');

  const labelAnchor = (x: number): 'start' | 'middle' | 'end' => {
    if (Math.abs(x - cx) < R * 0.12) return 'middle';
    return x > cx ? 'start' : 'end';
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((l, i) => (
        <Polygon key={i} points={getPoints(axes.map(() => l))} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
      ))}

      {axes.map((axis, i) => {
        const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const edgeX = cx + Math.cos(a) * R;
        const edgeY = cy + Math.sin(a) * R;
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        return (
          <React.Fragment key={axis}>
            <Line x1={cx} y1={cy} x2={edgeX} y2={edgeY} stroke="#cbd5e1" strokeWidth={1} />
            <SvgText x={lx} y={ly} textAnchor={labelAnchor(lx)} fontSize={fontSize} fontWeight="bold" fill="#6b7280">
              {getAxisLabel(axis)}
            </SvgText>
          </React.Fragment>
        );
      })}

      <Polygon points={getPoints(prev)} fill="rgba(167,139,250,0.1)" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" />
      <Polygon points={getPoints(now)} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}
