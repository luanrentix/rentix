import { useId } from 'react';
export type WeatherScene = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'night' | 'snow';
export function weatherScene(symbol: string, hour: number): WeatherScene {
  if (symbol.includes('thunder')) return 'storm';
  if (symbol.includes('snow') || symbol.includes('sleet')) return 'snow';
  if (symbol.includes('rain')) return 'rain';
  if (symbol.includes('_night') || hour < 6 || hour >= 18) return 'night';
  return symbol.includes('cloudy') || symbol.includes('fog') ? 'cloudy' : 'sunny';
}
export default function WeatherLandscape({ scene }: { scene: WeatherScene }) {
  const id = useId().replaceAll(':', '');
  const night = scene === 'night', rain = scene === 'rain' || scene === 'storm', snow = scene === 'snow';
  const colors = night ? ['#111b42', '#4e6194', '#19304c', '#10243b'] : rain ? ['#536d87', '#acbdc7', '#648b85', '#315d5c'] : snow ? ['#a7cada', '#e2eff3', '#bcced1', '#8da9ad'] : scene === 'cloudy' ? ['#a5c8d8', '#e7eee7', '#8cab8a', '#517d68'] : ['#79c6df', '#e4f1bf', '#74a876', '#3b7b5d'];
  return <svg viewBox="0 0 1400 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full">
    <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} /></linearGradient><linearGradient id={`${id}-hill`} x2="0" y2="1"><stop stopColor={colors[2]} /><stop offset="1" stopColor={colors[3]} /></linearGradient><filter id={`${id}-blur`}><feGaussianBlur stdDeviation="9" /></filter></defs>
    <rect width="1400" height="280" fill={`url(#${id}-sky)`} />
    {night ? <><circle cx="1100" cy="62" r="27" fill="#eff3cd" /><circle cx="1111" cy="51" r="25" fill={colors[0]} />{[780, 870, 965, 1200, 1280, 1350].map((x, i) => <circle key={x} cx={x} cy={22 + (i * 23) % 80} r="1.5" fill="#fff" />)}</> : !rain && <><circle cx="1100" cy="62" r="48" fill="#fff2af" opacity=".3" filter={`url(#${id}-blur)`} /><circle cx="1100" cy="62" r="29" fill="#fff2bd" /></>}
    {(rain || scene === 'cloudy') && [780, 960, 1190, 1370].map((x, i) => <g key={x} opacity={rain ? '.65' : '.85'} fill={rain ? '#677b91' : '#f5f8f3'}><ellipse cx={x} cy={45 + i % 2 * 17} rx="105" ry="22" /><ellipse cx={x - 30} cy={29 + i % 2 * 17} rx="48" ry="25" /></g>)}
    <path d="M0 215 Q130 100 300 190 T650 165 T980 139 T1400 160 V280 H0Z" fill={colors[2]} opacity=".6" />
    <path d="M0 230 Q230 120 420 218 T790 185 T1140 180 T1400 200 V280 H0Z" fill={`url(#${id}-hill)`} />
    <path d="M740 280 Q930 180 1050 211 Q1210 251 1400 170 V280Z" fill={colors[3]} />
    {Array.from({ length: 40 }, (_, i) => { const x = 580 + i * 23, y = 230 + Math.sin(i * .7) * 21; return <g key={i} opacity=".55"><rect x={x} y={y} width="3" height="35" fill={colors[3]} /><circle cx={x + 1} cy={y} r={14 + i % 4 * 3} fill={i % 2 ? colors[2] : colors[3]} /></g>; })}
    {rain && Array.from({ length: 35 }, (_, i) => <path key={i} d={`M${650 + i * 25} ${35 + i % 5 * 37}l-8 20`} stroke="#d7e8f0" strokeWidth="2" opacity=".5" />)}
    {snow && Array.from({ length: 30 }, (_, i) => <circle key={i} cx={650 + i * 26} cy={22 + i % 7 * 31} r="2" fill="white" opacity=".8" />)}
    {scene === 'storm' && <path d="M1180 65l-24 48h21l-14 36 46-58h-27l13-26z" fill="#ffed9b" />}
  </svg>;
}
