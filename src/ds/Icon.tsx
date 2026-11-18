/**
 * Ícones exportados do Figma (página "Design System", componentes Icon/*).
 * Monocromáticos aceitam `color`; os de várias cores (tiles, etapas, Termi Premium) mantêm as cores do Figma.
 */
import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { color as C, gold } from './tokens';

type Draw = (c: string) => React.ReactNode;
type IconDef = { box: number; color: string; draw: Draw };

const stroke = (c: string, w = 1.58333) => ({
  stroke: c,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

const ARROW =
  'M22.5 10.5002H6.234L12.3945 3.21925L10.1055 1.28125L1.035 12.0002L10.1055 22.7192L12.3945 20.7812L6.234 13.5002H22.5V10.5002Z';

const ICONS = {
  arrowLeft: { box: 24, color: C.text.primary, draw: (c) => <Path d={ARROW} fill={c} /> },
  arrowRight: {
    box: 24,
    color: C.text.primary,
    draw: (c) => <Path d={ARROW} fill={c} transform="matrix(-1 0 0 1 24 0)" />,
  },
  chevronRight: { box: 20, color: C.text.muted, draw: (c) => <Path d="M7.5 5L12.5 10L7.5 15" {...stroke(c, 1.66667)} /> },
  region: {
    box: 20,
    color: C.text.tertiary,
    draw: (c) => (
      <Path
        transform="translate(1.6667 1.6667)"
        fill={c}
        d="M 16.66666603088379 11.666666221618653 L 16.66666603088379 9.999999618530275 L 9.58333296775818 5.833333110809327 L 9.58333296775818 1.2499999523162844 C 9.58333296775818 0.558333325942357 9.024999641815821 0 8.333333015441895 0 C 7.641666389067967 0 7.083333063125611 0.558333325942357 7.083333063125611 1.2499999523162844 L 7.083333063125611 5.833333110809327 L 0 9.999999618530275 L 0 11.666666221618653 L 7.083333063125611 9.58333296775818 L 7.083333063125611 14.166666126251222 L 4.999999809265137 15.416666078567506 L 4.999999809265137 16.66666603088379 L 8.333333015441895 15.8333327293396 L 11.666666221618653 16.66666603088379 L 11.666666221618653 15.416666078567506 L 9.58333296775818 14.166666126251222 L 9.58333296775818 9.58333296775818 L 16.66666603088379 11.666666221618653 Z"
      />
    ),
  },
  timer: {
    box: 20,
    color: C.text.tertiary,
    draw: (c) => (
      <Path
        fill={c}
        d="M15.8583 6.1585L17.0417 4.97516C16.6667 4.55016 16.2917 4.16683 15.8667 3.80016L14.6833 5.00016C13.3917 3.95016 11.7667 3.3335 10 3.3335C8.01088 3.3335 6.10322 4.12367 4.6967 5.53019C3.29018 6.93672 2.5 8.84437 2.5 10.8335C2.5 12.8226 3.29018 14.7303 4.6967 16.1368C6.10322 17.5433 8.01088 18.3335 10 18.3335C14.1667 18.3335 17.5 14.9752 17.5 10.8335C17.5 9.06683 16.8833 7.44183 15.8583 6.1585ZM10.8333 11.6668H9.16667V5.8335H10.8333V11.6668ZM12.5 0.833496H7.5V2.50016H12.5V0.833496Z"
      />
    ),
  },
  departures: {
    box: 32,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path
          fill={c}
          stroke={c}
          strokeWidth={0.34}
          d="M11.9482 9.17676C12.2597 9.19863 12.5632 9.28597 12.8389 9.43262L19.6309 13.0459L19.6982 13.082L19.7705 13.0557L22.5781 12.0342C23.5473 11.6815 24.5823 11.5463 25.6094 11.6396L26.1963 11.6934C26.4701 11.7183 26.7314 11.8205 26.9492 11.9883C27.1669 12.156 27.3328 12.3824 27.4268 12.6406C27.5207 12.8989 27.5395 13.1788 27.4805 13.4473C27.4214 13.7157 27.2865 13.9622 27.0928 14.1572L26.6777 14.5752C25.951 15.3069 25.0716 15.8688 24.1025 16.2217L14.8809 19.5781C13.3715 20.1273 11.7711 20.3837 10.166 20.333L7.1709 20.2383L4.1875 16.6387C4.18049 16.6301 4.17521 16.6202 4.17285 16.6094C4.1705 16.5985 4.17094 16.5869 4.17383 16.5762C4.17674 16.5654 4.18198 16.5551 4.18945 16.5469C4.19706 16.5386 4.20721 16.5322 4.21777 16.5283L5.8457 15.9355C6.01642 15.8734 6.19915 15.8505 6.37988 15.8691C6.56066 15.8878 6.73524 15.9471 6.88965 16.043L8.54492 17.0713L8.61621 17.1152L8.69434 17.0869L14.1016 15.1191L14.3623 15.0244L14.1602 14.834L9.12109 10.0635L9.11035 10.0459L9.10938 10.0254C9.11078 10.0186 9.11462 10.0121 9.11914 10.0068C9.12361 10.0018 9.12942 9.99741 9.13574 9.99512L11.0303 9.30566C11.3237 9.1989 11.6367 9.15494 11.9482 9.17676Z"
        />
        <Path d="M4.689 23.424H28" {...stroke(c, 2.05684)} />
      </>
    ),
  },
  window: {
    box: 16,
    color: C.accent.default,
    draw: (c) => (
      <Path
        d="M3.333 5.667h9.334M7.333 3.667h1.334M3.333 6A4.667 4.667 0 0 1 12.667 6v4a4.667 4.667 0 0 1-9.334 0V6Z"
        {...stroke(c, 1.33333)}
      />
    ),
  },
  globe: {
    box: 16,
    color: 'rgba(255,255,255,0.7)',
    draw: (c) => (
      <Path
        fill={c}
        d="M8.00004 1.3335C4.32671 1.3335 1.33337 4.32683 1.33337 8.00016C1.33337 11.6735 4.32671 14.6668 8.00004 14.6668C11.6734 14.6668 14.6667 11.6735 14.6667 8.00016C14.6667 4.32683 11.6734 1.3335 8.00004 1.3335ZM2.66671 8.00016C2.66671 7.40016 2.77337 6.82683 2.95337 6.28683L4.00004 7.3335L5.33337 8.66683V10.0002L6.66671 11.3335L7.33337 12.0002V13.2868C4.70671 12.9602 2.66671 10.7135 2.66671 8.00016ZM12.22 11.2468C11.7867 10.8935 11.1267 10.6668 10.6667 10.6668V10.0002C10.6667 9.26683 10.0667 8.66683 9.33337 8.66683H6.66671V6.66683C7.40004 6.66683 8.00004 6.06683 8.00004 5.3335V4.66683H8.66671C9.40004 4.66683 10 4.06683 10 3.3335V3.06016C11.9534 3.8535 13.3334 5.76683 13.3334 8.00016C13.3334 9.22016 12.9134 10.3468 12.22 11.2468Z"
      />
    ),
  },
  plane: {
    box: 21,
    color: C.status.warning,
    draw: (c) => (
      <Path
        fill={c}
        d="M7 18.6667L8.66667 18.6667L12.8333 11.5833L17.4167 11.5833C18.1083 11.5833 18.6667 11.025 18.6667 10.3333C18.6667 9.64167 18.1083 9.08333 17.4167 9.08333L12.8333 9.08333L8.66667 2L7.00001 2L9.08334 9.08333L4.50001 9.08333L3.25001 7L2.00001 7L2.83334 10.3333L2.00001 13.6667L3.25001 13.6667L4.50001 11.5833L9.08334 11.5833L7 18.6667Z"
      />
    ),
  },
  speaker: {
    box: 20,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path d="M3.333 7.5v5h3.334l4.166 3.333V4.167L6.667 7.5H3.333Z" {...stroke(c)} />
        <Path
          d="M13.75 7.083a4.17 4.17 0 0 1 0 5.834M15.833 5a7.07 7.07 0 0 1 0 10"
          {...stroke(c)}
        />
      </>
    ),
  },
  windowView: {
    box: 20,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path d="M15.833 7.917a5.833 5.833 0 0 0-11.666 0v4.166a5.833 5.833 0 0 0 11.666 0V7.917Z" {...stroke(c)} />
        <Path d="M6.25 12.5c1.667-1.667 2.917-1.667 4.167 0 1.25 1.667 2.5 1.667 3.75 0" {...stroke(c)} />
      </>
    ),
  },
  soundEngine: {
    box: 20,
    color: C.accent.default,
    draw: (c) => (
      <>
        <Circle cx={10} cy={10} r={7.5} {...stroke(c)} />
        <Circle cx={10} cy={10} r={1.667} {...stroke(c)} />
        <Path d="M10 8.333V2.917M11.5 10.833l4.667 2.667M8.5 10.833 3.833 13.5" {...stroke(c)} />
      </>
    ),
  },
  soundWhiteNoise: {
    box: 20,
    color: C.text.primary,
    draw: (c) => <Path d="M2.5 10h1.667M5.833 6.667v6.666M9.167 4.167v11.666M12.5 6.667v6.666M15.833 8.333v3.334" {...stroke(c)} />,
  },
  soundCabin: {
    box: 20,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path d="M5.833 2.5V10c0 .442.176.866.489 1.179.312.312.736.488 1.178.488h5.833L15 17.5" {...stroke(c)} />
        <Path d="M4.167 17.5h7.5" {...stroke(c)} />
      </>
    ),
  },
  soundRain: {
    box: 20,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path
          d="M5.833 12.5a3.33 3.33 0 0 1-.416-6.667A4.58 4.58 0 0 1 14.25 7.083a2.92 2.92 0 0 1-.083 5.417H5.833Z"
          {...stroke(c)}
        />
        <Path d="m6.667 15-.834 2.5M10 15l-.833 2.5M13.333 15l-.833 2.5" {...stroke(c)} />
      </>
    ),
  },
  soundLofi: {
    box: 20,
    color: C.text.primary,
    draw: (c) => (
      <>
        <Path d="M7.5 15V4.167L16.667 2.5v10.833" {...stroke(c)} />
        <Circle cx={5.417} cy={15} r={2.083} {...stroke(c)} />
        <Circle cx={14.583} cy={13.333} r={2.083} {...stroke(c)} />
      </>
    ),
  },
  lock: {
    box: 12,
    color: C.accent.default,
    draw: (c) => (
      <>
        <Rect x={2.5} y={5.5} width={7} height={5} rx={1} {...stroke(c, 1.3)} />
        <Path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" {...stroke(c, 1.3)} />
      </>
    ),
  },
  suitcaseLine: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Rect x={3} y={6} width={14} height={11} rx={2} {...stroke(c, 1.6)} />
        <Path d="M7.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M8 10v3M12 10v3" {...stroke(c, 1.6)} />
      </>
    ),
  },
  passport: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Rect x={4} y={2.5} width={12} height={15} rx={1.5} {...stroke(c, 1.6)} />
        <Circle cx={10} cy={9} r={3} {...stroke(c, 1.6)} />
        <Path d="M7.5 14h5" {...stroke(c, 1.6)} />
      </>
    ),
  },
  logbook: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12.5H5.5A1.5 1.5 0 0 0 4 17V4.5Z" {...stroke(c, 1.6)} />
        <Path d="M4 17a1.5 1.5 0 0 1 1.5-1.5H16M7.5 7h5M7.5 10h3" {...stroke(c, 1.6)} />
      </>
    ),
  },
  stats: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => <Path d="M3 16.5h14M5 14v-3M8.7 14V6M12.4 14V9M16 14V4.5" {...stroke(c, 1.6)} />,
  },
  firstClass: {
    box: 20,
    color: C.accent.default,
    draw: (c) => (
      <Path d="M6 3.5v7a2 2 0 0 0 2 2h6M5 12.5h9.5A1.5 1.5 0 0 1 16 14v1H5M7 15.5v2M14 15.5v2" {...stroke(c, 1.6)} />
    ),
  },
  settings: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Path d="M3.5 6h13M3.5 10h13M3.5 14h13" {...stroke(c, 1.6)} />
        <Circle cx={7} cy={6} r={1.8} fill={C.bg.app} stroke={c} strokeWidth={1.6} />
        <Circle cx={13} cy={10} r={1.8} fill={C.bg.app} stroke={c} strokeWidth={1.6} />
        <Circle cx={8.5} cy={14} r={1.8} fill={C.bg.app} stroke={c} strokeWidth={1.6} />
      </>
    ),
  },
  info: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Circle cx={10} cy={10} r={7.5} {...stroke(c, 1.6)} />
        <Path d="M10 9v5" {...stroke(c, 1.6)} />
        <Circle cx={10} cy={6.4} r={1} fill={c} />
      </>
    ),
  },
  help: {
    box: 20,
    color: C.text.secondary,
    draw: (c) => (
      <>
        <Path d="M4 5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3H6a2 2 0 0 1-2-2v-6Z" {...stroke(c, 1.6)} />
        <Path d="M8.6 7.2A1.4 1.4 0 1 1 10.6 8.6c-.5.2-.6.5-.6 1v.2" {...stroke(c, 1.6)} />
        <Circle cx={10} cy={11.6} r={0.9} fill={c} />
      </>
    ),
  },
  // Multicoloridos (cores fixas do Figma)
  checkStep: {
    box: 18,
    color: C.accent.default,
    draw: (c) => (
      <>
        <Circle cx={9} cy={9} r={9} fill={c} />
        <Path d="M5 9.2 7.6 11.8 13 6.4" {...stroke(C.bg.app, 2)} />
      </>
    ),
  },
  loadingStep: {
    box: 18,
    color: C.accent.default,
    draw: (c) => (
      <>
        <Circle cx={9} cy={9} r={7.5} stroke="rgba(255,255,255,0.2)" strokeWidth={3} fill="none" />
        <Path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" stroke={c} strokeWidth={3} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  plusTile: {
    box: 28,
    color: C.accent.default,
    draw: (c) => (
      <>
        <Rect width={28} height={28} rx={6} fill={c} />
        <Path d="M14 8v12M8 14h12" stroke={C.accent.on} strokeWidth={2.2} strokeLinecap="round" />
      </>
    ),
  },
  crewServiceTile: {
    box: 32,
    color: C.status.warning,
    draw: (c) => (
      <>
        <Rect width={32} height={32} fill={c} />
        <Path
          fill="#000"
          d="M16 14.5C15.1841 14.5 14.3866 14.2581 13.7083 13.8048C13.0299 13.3516 12.5012 12.7073 12.189 11.9536C11.8768 11.1998 11.7951 10.3704 11.9542 9.57025C12.1134 8.77008 12.5063 8.03508 13.0832 7.45819C13.6601 6.88129 14.3951 6.48843 15.1952 6.32926C15.9954 6.1701 16.8248 6.25179 17.5786 6.564C18.3323 6.87621 18.9765 7.40492 19.4298 8.08327C19.8831 8.76163 20.125 9.55915 20.125 10.375C20.1237 11.4686 19.6888 12.5171 18.9154 13.2904C18.1421 14.0638 17.0936 14.4988 16 14.5ZM22.75 24.25H11.2337L22.4959 14.3125C22.534 14.2789 22.5685 14.2415 22.599 14.2009C22.7018 14.0639 22.7551 13.896 22.75 13.7247C22.7452 13.5825 22.7002 13.4447 22.62 13.3272C22.5399 13.2097 22.428 13.1174 22.2973 13.061C22.1667 13.0047 22.0228 12.9867 21.8823 13.0091C21.7419 13.0315 21.6107 13.0934 21.504 13.1875L19.2034 15.2172C18.1519 14.7201 16.9992 14.4745 15.8364 14.4995C14.6736 14.5246 13.5325 14.8198 12.5034 15.3618C11.4743 15.9038 10.5854 16.6776 9.90685 17.6223C9.22831 18.5669 8.77876 19.6564 8.59374 20.8047C8.58824 20.8388 8.58511 20.8733 8.58436 20.9078L8.49999 24.9841C8.49786 25.0839 8.5157 25.1831 8.55244 25.276C8.58918 25.3688 8.64408 25.4534 8.71394 25.5247C8.7838 25.5961 8.8672 25.6527 8.95924 25.6914C9.05129 25.7301 9.15014 25.75 9.24999 25.75H22.75C22.9489 25.75 23.1397 25.671 23.2803 25.5303C23.421 25.3897 23.5 25.1989 23.5 25C23.5 24.8011 23.421 24.6103 23.2803 24.4697C23.1397 24.329 22.9489 24.25 22.75 24.25ZM21.6362 17.4063C21.5313 17.3936 21.4248 17.4032 21.3238 17.4345C21.2228 17.4659 21.1296 17.5182 21.0503 17.5881L15.2003 22.75H22.75C22.9489 22.75 23.1397 22.671 23.2803 22.5303C23.421 22.3897 23.5 22.1989 23.5 22C23.5027 20.471 23.0357 18.978 22.1622 17.7231C22.1018 17.6362 22.0238 17.563 21.9331 17.5084C21.8425 17.4538 21.7413 17.419 21.6362 17.4063Z"
        />
      </>
    ),
  },
  termiPremium: {
    box: 20,
    color: gold.stops[3].color,
    draw: () => (
      <>
        <Defs>
          <LinearGradient id="termiGold" x1="1.43" y1="4.64" x2="16.69" y2="21.68" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#D99A2B" />
            <Stop offset={0.35} stopColor="#FFE8A3" />
            <Stop offset={0.6} stopColor="#F2C24F" />
            <Stop offset={1} stopColor="#C98A21" />
          </LinearGradient>
        </Defs>
        <Path d="M8.92857 0H11.0714C12.0238 0 12.5 0.47619 12.5 1.42857V4.82143H10.9821V1.60714H9.01786V4.82143H7.5V1.42857C7.5 0.47619 7.97619 0 8.92857 0Z" fill="#C98A21" />
        <Rect x={1.43} y={4.64} width={17.14} height={15.36} rx={1.6} fill="url(#termiGold)" />
        <Path opacity={0.28} d="M3.21429 7.14286L7.5 5.35715H10.7143L3.92857 18.5714C2.97619 18.5714 2.5 18.0952 2.5 17.1429L3.21429 7.14286Z" fill="#fff" />
        <Rect x={6.43} y={9.29} width={1.61} height={3.57} rx={0.8} fill={gold.ink} />
        <Rect x={11.96} y={9.29} width={1.61} height={3.57} rx={0.8} fill={gold.ink} />
      </>
    ),
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
export const iconNames = Object.keys(ICONS) as IconName[];

export type IconProps = { name: IconName; size?: number; color?: string };

/** Ícone do sistema. `size` padrão = tamanho original do Figma. */
export function Icon({ name, size, color }: IconProps) {
  const def: IconDef = ICONS[name];
  const s = size ?? def.box;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${def.box} ${def.box}`}>
      <G>{def.draw(color ?? def.color)}</G>
    </Svg>
  );
}

/**
 * Ilustração da mala (marca do app). Versão vetorial simplificada da mala laranja das telas:
 * a original no Figma é um traçado de bitmap e não exporta limpo.
 */
export function Suitcase({ size = 48, tint = C.status.warning }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M19 14V9.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V14" stroke={tint} strokeWidth={2.4} fill="none" />
      <Rect x={9} y={14} width={30} height={26} rx={3} fill={tint} />
      <Rect x={18} y={22} width={2.6} height={7} rx={1.3} fill={C.bg.app} />
      <Rect x={27.4} y={22} width={2.6} height={7} rx={1.3} fill={C.bg.app} />
    </Svg>
  );
}
