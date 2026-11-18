// Rota, posição, rumo e sol — mesmas contas do protótipo web da janela.
// O protótipo voa Barcelona → Londres porque os blocos Landsat empacotados cobrem esse trajeto.

export const ROUTE = {
  from: { code: 'BCN', city: 'Barcelona', lat: 41.2971, lon: 2.0785 },
  to: { code: 'LHR', city: 'Londres', lat: 51.47, lon: -0.4543 },
  speedKmh: 874,
  distKm: 1148,
};

const rad = Math.PI / 180;
const v3 = (la: number, lo: number) => [
  Math.cos(la * rad) * Math.cos(lo * rad),
  Math.cos(la * rad) * Math.sin(lo * rad),
  Math.sin(la * rad),
];
const A = v3(ROUTE.from.lat, ROUTE.from.lon);
const B = v3(ROUTE.to.lat, ROUTE.to.lon);
const OM = Math.acos(A[0] * B[0] + A[1] * B[1] + A[2] * B[2]);

/** Posição [lat, lon] num trecho de 0 a 1 do grande círculo. */
export function pos(t: number): [number, number] {
  const s0 = Math.sin((1 - t) * OM) / Math.sin(OM);
  const s1 = Math.sin(t * OM) / Math.sin(OM);
  const v = [A[0] * s0 + B[0] * s1, A[1] * s0 + B[1] * s1, A[2] * s0 + B[2] * s1];
  return [Math.asin(v[2]) / rad, Math.atan2(v[1], v[0]) / rad];
}

export function bearing(a: [number, number], b: [number, number]) {
  const [la1, lo1] = a.map((x) => x * rad);
  const [la2, lo2] = b.map((x) => x * rad);
  const y = Math.sin(lo2 - lo1) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(lo2 - lo1);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

/** Elevação do sol (rad) e direção do sol no referencial leste/norte/cima. */
export function sun(ms: number, lat: number, lon: number) {
  const n = ms / 864e5 + 2440587.5 - 2451545;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 4e-7 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const H = (gmst + lon) * rad - ra;
  const la = lat * rad;
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(H));
  return { el, v: [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)] };
}

export function place(la: number, lo: number) {
  if (la > 51.1) return 'a região de Londres';
  if (la > 50.3 && lo < 1.4) return 'o sul da Inglaterra';
  if (la > 49.6 && lo < 1.4) return 'o Canal da Mancha';
  if (la > 47.6) return 'o noroeste da França';
  if (la > 45.2) return 'o oeste da França';
  if (la > 43.4) return 'o sudoeste da França';
  if (la > 42.4) return 'os Pireneus';
  return 'a Catalunha';
}

/**
 * Trecho do voo num instante. O avião voa na velocidade real; voos mais curtos
 * que a rota inteira começam no meio do caminho, para pousar no horário em Londres.
 */
export function progressAt(now: number, startAt: number, endAt: number) {
  const totalMin = (endAt - startAt) / 60000;
  const routeMin = (ROUTE.distKm / ROUTE.speedKmh) * 60;
  const remainingMin = Math.max(0, (endAt - now) / 60000);
  if (totalMin <= routeMin) return Math.min(1, Math.max(0, 1 - remainingMin / routeMin));
  // Voo mais longo que a rota: estica o trajeto para caber no tempo.
  return Math.min(1, Math.max(0, 1 - remainingMin / totalMin));
}
