// Port para SkSL do shader da "Janela ao vivo · com Blender" (protótipo web aprovado).
// Mesma câmera (assento atrás da asa, olhando para o lado esquerdo), mesma terra,
// mesmas nuvens e mesmo céu. Texturas viram "uniform shader" e são lidas em pixels.

// Tamanhos das texturas na GPU. Reduzidos para caber no cache de texturas do Skia
// (256 MB por padrão): acima disso ele reenviava as texturas a cada quadro.
export const ATLAS_PX = { near: 2048, mid: 1024, imp: 1024 } as const;

export const SKSL = `
uniform float2 res;
uniform float3 sunD;
uniform float lat0;
uniform float lon0;
uniform float hd;
uniform float cover;
uniform float drift;
uniform float useSat;
uniform float hq;
uniform float3 bNear;
uniform float3 bMid;
uniform float3 bImp;

uniform shader bD;
uniform shader bN;
uniform shader dN;
uniform shader cl;
uniform shader tNear;
uniform shader tMid;
uniform shader tImp;

const float R = 6371.0;
const float H = 10.5;
const float2 SZB = float2(2048.0, 1792.0);
const float2 SZD = float2(1280.0, 1536.0);
const float2 SZC = float2(1024.0, 1024.0);
const float2 SZN = float2(2048.0, 2048.0);
const float2 SZM = float2(1024.0, 1024.0);
const float2 SZI = float2(1024.0, 1024.0);

float h21(float2 p) { p = fract(p * float2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(float2 p) {
  float2 i = floor(p); float2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + float2(1, 0)), f.x), mix(h21(i + float2(0, 1)), h21(i + float2(1, 1)), f.x), f.y);
}
float fbm(float2 p) {
  float a = 0.5; float s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + float2(17.1, 9.3); a *= 0.5; }
  return s;
}
float2 ll(float2 km) { float la = lat0 + km.y / 111.2; return float2(lon0 + km.x / (111.2 * cos(radians(lat0))), la); }

bool inside(float2 uv) { return uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0; }

half4 atlNear(float2 g) {
  float2 uv = float2((g.x - bNear.x) / bNear.z, (bNear.y - g.y) / bNear.z);
  if (!inside(uv)) return half4(0);
  half4 s = tNear.eval(uv * SZN);
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return half4(s.rgb, s.a * smoothstep(0.0, 0.07, e));
}
half4 atlMid(float2 g) {
  float2 uv = float2((g.x - bMid.x) / bMid.z, (bMid.y - g.y) / bMid.z);
  if (!inside(uv)) return half4(0);
  half4 s = tMid.eval(uv * SZM);
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return half4(s.rgb, s.a * smoothstep(0.0, 0.07, e));
}
half4 atlImp(float2 g) {
  float2 uv = float2((g.x - bImp.x) / bImp.z, (bImp.y - g.y) / bImp.z);
  if (!inside(uv)) return half4(0);
  half4 s = tImp.eval(uv * SZI);
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return half4(s.rgb, s.a * smoothstep(0.0, 0.07, e));
}

float3 grade(float3 c) { float l = dot(c, float3(0.3, 0.59, 0.11)); return mix(float3(l), c, 0.88) * 1.12 + 0.008; }

float3 ground(float2 g, out float3 night) {
  float2 tb = float2((g.x + 18.0) / 36.0, (63.0 - g.y) / 31.5);
  float2 td = float2((g.x + 4.5) / 11.25, (54.0 - g.y) / 13.5);
  float3 c = float3(0.015, 0.03, 0.06); night = float3(0.0);
  if (inside(tb)) { c = float3(bD.eval(tb * SZB).rgb); night = float3(bN.eval(tb * SZB).rgb); }
  if (inside(td)) {
    float e = min(min(td.x, 1.0 - td.x), min(td.y, 1.0 - td.y)); float w = smoothstep(0.0, 0.06, e);
    night = mix(night, float3(dN.eval(td * SZD).rgb), w);
  }
  half4 m = atlMid(g); c = mix(c, grade(float3(m.rgb)), float(m.a));
  half4 n = atlNear(g); c = mix(c, grade(float3(n.rgb)), float(n.a));
  half4 im = atlImp(g); float bm = max(max(night.r, night.g), night.b);
  float sp = vn(g * float2(900.0 * cos(radians(g.y)), 900.0)) * vn(g * float2(2300.0 * cos(radians(g.y)), 2300.0) + 7.0);
  float3 city = float3(1.0, 0.72, 0.42) * pow(float(im.r), 1.3) * (0.12 + 2.0 * bm) * (0.3 + 2.2 * sp);
  night = mix(night, city, float(im.a));
  return c;
}

float cloudAt(float2 g, float2 km) {
  float n = fbm(km * 0.05) * 0.65 + fbm(km * 0.23) * 0.35;
  float gen = smoothstep(1.02 - cover, 1.32 - cover, n);
  float2 tc = float2((g.x + 18.0) / 36.0, (63.0 - g.y) / 36.0);
  float2 s = (useSat > 0.5 && inside(tc)) ? float2(cl.eval(tc * SZC).rg) : float2(0.0);
  float sat = s.r * smoothstep(0.15, 0.95, n + s.r * 0.55);
  return mix(gen, sat, s.g * useSat);
}

float3 skyCol(float3 d, float day, float warm) {
  float3 zen = mix(float3(0.012, 0.02, 0.055), float3(0.15, 0.36, 0.76), day);
  float3 hor = mix(float3(0.05, 0.07, 0.15), float3(0.68, 0.8, 0.93), day);
  float e = clamp(d.z + 0.06, 0.0, 1.0); float3 c = mix(hor, zen, pow(e, 0.42));
  float2 sd = normalize(sunD.xy + 1e-4); float2 dd = normalize(d.xy + 1e-4); float side = pow(max(dot(sd, dd), 0.0), 2.0);
  c += float3(1.0, 0.42, 0.12) * warm * side * (1.0 - smoothstep(0.0, 0.35, e)) * 0.9 + float3(1.0, 0.55, 0.3) * warm * (1.0 - smoothstep(0.0, 0.25, e)) * 0.18;
  float m = max(dot(d, sunD), 0.0); c += float3(1.0, 0.85, 0.6) * pow(m, 12.0) * 0.35 * (day + warm);
  return c;
}

half4 main(float2 fc) {
  float2 q = float2(fc.x / res.x * 2.0 - 1.0, 1.0 - fc.y / res.y * 2.0);
  q.x *= res.x / res.y;
  float3 F = float3(sin(hd), cos(hd), 0.0); float3 L = float3(-cos(hd), sin(hd), 0.0); float3 Z = float3(0, 0, 1);
  float3 f = normalize(0.3265 * F + 0.922 * L - 0.2079 * Z);
  float3 r = normalize(0.9425 * F - 0.3338 * L);
  float3 u = normalize(0.0694 * F + 0.196 * L + 0.9781 * Z);
  float3 d = normalize(f + q.x * 0.9 * r + q.y * 0.9 * u);
  float day = smoothstep(-0.12, 0.12, sunD.z);
  float warm = exp(-abs(sunD.z - 0.03) * 14.0) * smoothstep(-0.14, -0.02, sunD.z);
  float3 col = skyCol(d, day, warm);
  if (day < 0.6) { float3 s = floor(d * 420.0); col += float3(step(0.9975, h21(s.xy + s.z * 7.1))) * (1.0 - day / 0.6) * smoothstep(-0.02, 0.15, d.z); }
  col = mix(col, float3(1.0, 0.97, 0.88) * (1.0 + warm), smoothstep(0.9994, 0.9997, dot(d, sunD)) * step(-0.06, sunD.z));
  float3 hor = mix(float3(0.05, 0.07, 0.15), float3(0.68, 0.8, 0.93), day) + float3(1.0, 0.42, 0.12) * warm * 0.5;
  float3 oo = float3(0.0, 0.0, R + H);
  float b = dot(oo, d); float c = dot(oo, oo) - R * R; float disc = b * b - c;
  if (disc > 0.0 && -b - sqrt(disc) > 0.0) {
    float t = -b - sqrt(disc); float3 p = oo + d * t; float2 g = ll(p.xy);
    float3 nl; float3 gc = ground(g, nl);
    float lit = clamp(sunD.z * 1.6 + 0.15, 0.0, 1.0);
    float2 sh = p.xy + sunD.xy / max(sunD.z, 0.15) * (-3.0);
    float cs = hq > 0.5 ? cloudAt(ll(sh), sh + F.xy * drift) : 0.0;
    gc = gc * (0.16 + 1.15 * lit * (1.0 - 0.55 * cs)) * day + gc * 0.03;
    float lg = smoothstep(0.25, 0.85, max(max(nl.r, nl.g), nl.b)); gc += float3(1.0, 0.72, 0.35) * lg * (1.0 - day) * 1.5;
    gc = mix(gc, float3(0.42, 0.52, 0.68) * (lit * day + 0.02), 0.14 * day);
    col = mix(gc, hor * 0.92, 1.0 - exp(-t / 75.0));
    float tc2 = (H - 3.0) / max(-d.z, 1e-3);
    if (tc2 < t) {
      float2 cp = d.xy * tc2; float2 cg = ll(cp); float a = cloudAt(cg, cp + F.xy * drift);
      float lt = hq > 0.5 ? cloudAt(ll(cp + sunD.xy * 2.5), cp + sunD.xy * 2.5 + F.xy * drift) : 0.3;
      float3 cc = mix(float3(0.07, 0.08, 0.12), float3(0.97, 0.97, 0.96), day) * (1.0 - 0.35 * lt * day) + float3(1.0, 0.5, 0.2) * warm * 0.55;
      float far = 1.0 - exp(-tc2 / 170.0);
      col = mix(col, mix(cc, hor, far * 0.75), a * (1.0 - far * 0.45));
    }
  }
  return half4(half3(col), 1.0);
}
`;

/** Ordem dos uniforms numéricos, igual à declaração no SKSL. */
export function uniformArray(u: {
  res: [number, number];
  sunD: number[];
  lat0: number;
  lon0: number;
  hd: number;
  cover: number;
  drift: number;
  useSat: number;
  hq: number;
  bNear: number[];
  bMid: number[];
  bImp: number[];
}): number[] {
  return [
    ...u.res,
    ...u.sunD,
    u.lat0,
    u.lon0,
    u.hd,
    u.cover,
    u.drift,
    u.useSat,
    u.hq,
    ...u.bNear,
    ...u.bMid,
    ...u.bImp,
  ];
}
