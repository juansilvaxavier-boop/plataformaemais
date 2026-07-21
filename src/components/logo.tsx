/**
 * Marca EMAIS Urbanismo: "E" geométrico formado por células divididas em
 * triângulos (verde-azulado claro / escuro), reproduzindo o estilo do
 * logotipo oficial da marca.
 */

const LIGHT = "#1ab48a";
const DARK = "#0b6350";

function Cell({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g stroke="white" strokeWidth={4} strokeLinejoin="round">
      <polygon points={`${x},${y} ${x + w},${y} ${x},${y + h}`} fill={LIGHT} />
      <polygon points={`${x + w},${y} ${x + w},${y + h} ${x},${y + h}`} fill={DARK} />
    </g>
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const col = 100;
  const row = 100;
  const midRowH = 70;
  const midRowY = 200 + (row - midRowH) / 2;

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 200 500"
      className={className}
      aria-label="EMAIS Urbanismo"
      role="img"
    >
      {/* barra superior */}
      <Cell x={0} y={0} w={col} h={row} />
      <Cell x={col} y={0} w={col} h={row} />
      {/* haste esquerda */}
      <Cell x={0} y={row} w={col} h={row} />
      {/* barra do meio (mais curta) */}
      <Cell x={0} y={200} w={col} h={row} />
      <Cell x={col} y={midRowY} w={col} h={midRowH} />
      {/* haste esquerda */}
      <Cell x={0} y={300} w={col} h={row} />
      {/* barra inferior */}
      <Cell x={0} y={400} w={col} h={row} />
      <Cell x={col} y={400} w={col} h={row} />
    </svg>
  );
}

export function Logo({ theme = "light" }: { theme?: "light" | "dark" }) {
  const titleColor = theme === "dark" ? "text-white" : "text-slate-900";
  const subtitleColor = theme === "dark" ? "text-slate-300" : "text-slate-500";

  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={26} />
      <div className="leading-tight">
        <div className={`font-bold text-lg tracking-tight ${titleColor}`}>
          <span className={theme === "dark" ? "text-emerald-400" : "text-[#0b6350]"}>E</span>MAIS
        </div>
        <div className={`text-[10px] font-medium tracking-[0.2em] ${subtitleColor}`}>URBANISMO</div>
      </div>
    </div>
  );
}
