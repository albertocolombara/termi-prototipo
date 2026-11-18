// Rota simulada do protótipo (sem dado ao vivo): São Paulo (GRU) → Fortaleza (FOR).
export const ROUTE = {
  from: { code: 'GRU', city: 'São Paulo', lat: -23.43, lon: -46.47 },
  to: { code: 'FOR', city: 'Fortaleza', lat: -3.78, lon: -38.53 },
};

export function positionAt(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  return {
    lat: ROUTE.from.lat + (ROUTE.to.lat - ROUTE.from.lat) * p,
    lon: ROUTE.from.lon + (ROUTE.to.lon - ROUTE.from.lon) * p,
  };
}

/** Altura do sol em graus para um lugar e um instante (aproximação suficiente para o céu). */
export function sunAltitude(date: Date, lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarTime = utcHours + lon / 15;
  const hourAngle = (solarTime - 12) * 15;
  const sinAlt =
    Math.sin(lat * rad) * Math.sin(decl * rad) +
    Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(hourAngle * rad);
  return Math.asin(sinAlt) / rad;
}

export function describeSun(alt: number) {
  if (alt > 8) return 'dia';
  if (alt > -4) return alt > 0 ? 'sol baixo' : 'pôr/nascer do sol';
  if (alt > -12) return 'crepúsculo';
  return 'noite';
}
