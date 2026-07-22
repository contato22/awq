// Brasão recriado a partir da logo enviada (escudo + balança + monograma "P").
// Se o arquivo original (PNG/SVG) for enviado, pode substituir este componente
// por um <Image src="/patricia-canto/logo.svg" .../> para fidelidade exata.
export default function PatriciaCantoLogo({
  className = "h-10 w-10",
  shieldColor = "#FFFFFF",
  markColor = "#847455",
}: {
  className?: string;
  shieldColor?: string;
  markColor?: string;
}) {
  return (
    <svg viewBox="0 0 64 72" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4h56v34c0 18-14 30-28 30S4 56 4 38V4z"
        fill={shieldColor}
      />
      <g stroke={markColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 24c0-6 5-10 11-10s10 4 10 8-4 6-8 6" fill="none" />
        <line x1="27" y1="20" x2="27" y2="52" />
        <line x1="20" y1="52" x2="34" y2="52" />
        <line x1="16" y1="30" x2="30" y2="26" />
        <line x1="16" y1="30" x2="12" y2="38" />
        <line x1="16" y1="30" x2="20" y2="38" />
        <path d="M8 38a4 4 0 0 0 8 0" fill="none" />
        <line x1="30" y1="26" x2="44" y2="30" />
        <line x1="44" y1="30" x2="40" y2="38" />
        <line x1="44" y1="30" x2="48" y2="38" />
        <path d="M36 38a4 4 0 0 0 8 0" fill="none" />
      </g>
    </svg>
  );
}
