import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PixelRatio, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  ColorMatrix,
  FilterMode,
  Group,
  Image as SkiaImage,
  LinearGradient,
  MipmapMode,
  Picture,
  RadialGradient,
  Rect,
  Skia,
  SkImage,
  SkShader,
  TileMode,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { SKSL, uniformArray } from './shader';
import { makeAtlas, AtlasState } from './tiles';
import { bearing, pos, sun } from './geo';

const effect = Skia.RuntimeEffect.Make(SKSL);
const EMPTY = Skia.Shader.MakeColor(Skia.Color('transparent'));
const OFF: [number, number, number] = [1e3, 1e3, 1];

// Qualidade: resolução da paisagem em relação à tela (as camadas do Blender ficam sempre nítidas).
export const QUALITY = [
  { label: 'Econômica', dpr: 0.75, hq: 0 },
  { label: 'Normal', dpr: 1.25, hq: 1 },
  { label: 'Máxima', dpr: 2, hq: 1 },
];

// Mesmo filtro "warm" do protótipo web (sepia .5, saturação 1,25, brilho .97) na asa do entardecer.
const WARM = [
  0.7759, 0.2955, 0.0853, 0, 0,
  0.143, 0.8514, 0.0725, 0, 0,
  0.0963, 0.153, 0.6563, 0, 0,
  0, 0, 0, 1, 0,
];

const sm = (a: number, b: number, x: number) => {
  x = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

function texShader(img: SkImage | null): SkShader {
  return img
    ? img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.Linear)
    : EMPTY;
}

type Props = {
  width: number;
  /** Trecho da rota (0 a 1). */
  progress: number;
  /** Instante usado para o sol (ms). */
  time: number;
  /** Quanto o avião já andou desde o embarque (km), para as nuvens passarem. */
  driftKm: number;
  fps: number;
  quality: number;
  satClouds: boolean;
  showMeter: boolean;
};

export function Janela({ width, progress, time, driftKm, fps, quality, satClouds, showMeter }: Props) {
  const height = Math.round((width * 4) / 3);
  const q = QUALITY[quality];
  const dpr = PixelRatio.get();
  // A paisagem é desenhada num canvas menor e ampliada: o shader roda em menos pixels.
  const scale = Math.max(1, dpr / q.dpr);
  const lw = Math.round(width / scale);
  const lh = Math.round(height / scale);

  const bD = useImage(require('../../assets/janela/base_dia.jpg'));
  const bN = useImage(require('../../assets/janela/base_noite.jpg'));
  const dN = useImage(require('../../assets/janela/det_noite.jpg'));
  const cl = useImage(require('../../assets/janela/nuvens.png'));
  const asaDia = useImage(require('../../assets/janela/asa_dia.webp'));
  const asaTarde = useImage(require('../../assets/janela/asa_entardecer.webp'));
  const asaNoite = useImage(require('../../assets/janela/asa_noite.webp'));
  const asaBeacon = useImage(require('../../assets/janela/asa_beacon.webp'));
  const molDia = useImage(require('../../assets/janela/moldura_dia.webp'));
  const molTarde = useImage(require('../../assets/janela/moldura_entardecer.webp'));
  const molNoite = useImage(require('../../assets/janela/moldura_noite.webp'));

  const base = useMemo(
    () => ({ bD: texShader(bD), bN: texShader(bN), dN: texShader(dN), cl: texShader(cl) }),
    [bD, bN, dN, cl],
  );

  const [near, setNear] = useState<AtlasState>({ image: null, b: OFF });
  const [mid, setMid] = useState<AtlasState>({ image: null, b: OFF });
  const [imp, setImp] = useState<AtlasState>({ image: null, b: OFF });
  const atlases = useRef<ReturnType<typeof makeAtlas>[] | null>(null);
  if (!atlases.current) {
    atlases.current = [makeAtlas('w10', 10, setNear), makeAtlas('w8', 8, setMid), makeAtlas('i9', 9, setImp)];
  }
  const atlasShaders = useMemo(
    () => ({ near: texShader(near.image), mid: texShader(mid.image), imp: texShader(imp.image) }),
    [near.image, mid.image, imp.image],
  );

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Relógio da janela: só redesenha no ritmo escolhido (10 quadros/s por padrão).
  const [tick, setTick] = useState(0);
  const meter = useRef({ draws: 0, drawFps: 0, last: Date.now(), ui: 60, uiFrames: 0, uiLast: Date.now() });
  const [meterText, setMeterText] = useState('');
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);
  useEffect(() => {
    if (!showMeter) return;
    let raf = 0;
    const loop = () => {
      const m = meter.current;
      m.uiFrames++;
      const now = Date.now();
      if (now - m.uiLast >= 1000) {
        m.ui = (m.uiFrames * 1000) / (now - m.uiLast);
        m.uiFrames = 0;
        m.uiLast = now;
        setMeterText(
          `tela ${Math.round(m.ui)} fps · janela ${m.drawFps} fps · ${lw * Math.round(dpr)}×${lh * Math.round(dpr)} px`,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showMeter, lw, lh, dpr]);

  const [la, lo] = pos(progress);
  const hd = bearing([la, lo], pos(Math.min(progress + 0.01, 1))) || bearing(pos(0.98), [51.47, -0.4543]);
  const s = sun(time, la, lo);
  const el = (s.el * 180) / Math.PI;
  const wt = 1 - sm(3, 15, el);
  const wn = 1 - sm(-9, -1, el);

  useEffect(() => {
    atlases.current!.forEach((a) => a.update(la, lo));
  }, [la, lo]);

  const picture = useMemo(() => {
    if (!effect) return null;
    const m = meter.current;
    m.draws++;
    const now = Date.now();
    if (now - m.last >= 1000) {
      m.drawFps = m.draws;
      m.draws = 0;
      m.last = now;
    }
    const uniforms = uniformArray({
      res: [lw, lh],
      sunD: s.v,
      lat0: la,
      lon0: lo,
      hd: (hd * Math.PI) / 180,
      cover: 0.45,
      drift: driftKm,
      useSat: satClouds ? 1 : 0,
      hq: q.hq,
      bNear: near.image ? near.b : OFF,
      bMid: mid.image ? mid.b : OFF,
      bImp: imp.image ? imp.b : OFF,
    });
    const shader = effect.makeShaderWithChildren(uniforms, [
      base.bD,
      base.bN,
      base.dN,
      base.cl,
      atlasShaders.near,
      atlasShaders.mid,
      atlasShaders.imp,
    ]);
    const rec = Skia.PictureRecorder();
    const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, lw, lh));
    const paint = Skia.Paint();
    paint.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(0, 0, lw, lh), paint);
    return rec.finishRecordingAsPicture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, lw, lh, quality, satClouds, base, atlasShaders]);

  // Beacon vermelho da fuselagem: pulso lento a cada 3,6 s, só ao entardecer e à noite.
  const bk = 0.32 * wn + 0.1 * wt;
  let beacon = 0;
  if (!reduceMotion) {
    const ph = (Date.now() % 3600) / 3600;
    beacon = ph < 0.15 ? ease(ph / 0.15) * bk : ph < 0.3 ? (1 - ease((ph - 0.15) / 0.15)) * bk : 0;
  }
  const glow = wn * 0.75 + wt * 0.25;
  const loaded = !!(bD && asaDia && molDia);

  return (
    <View style={[styles.view, { width, height }]}>
      <View style={{ width: lw, height: lh, transform: [{ scale }], transformOrigin: 'top left' }}>
        <Canvas style={{ width: lw, height: lh }}>{picture && <Picture picture={picture} />}</Canvas>
      </View>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          {asaDia && <SkiaImage image={asaDia} x={0} y={0} width={width} height={height} fit="cover" />}
          {asaTarde && (
            <SkiaImage image={asaTarde} x={0} y={0} width={width} height={height} fit="cover" opacity={wt}>
              <ColorMatrix matrix={WARM} />
            </SkiaImage>
          )}
          {asaNoite && <SkiaImage image={asaNoite} x={0} y={0} width={width} height={height} fit="cover" opacity={wn} />}
          {asaBeacon && beacon > 0.001 && (
            <SkiaImage
              image={asaBeacon}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
              opacity={beacon}
              blendMode="screen"
            />
          )}
          {glow > 0.001 && (
            <Rect
              x={width * 0.254 - width * 0.025}
              y={height * 0.442 - width * 0.025}
              width={width * 0.05}
              height={width * 0.05}
              opacity={glow}
              blendMode="screen"
            >
              <RadialGradient
                c={vec(width * 0.254, height * 0.442)}
                r={width * 0.025}
                colors={['#FFFFFF', '#FFFFFF', '#FFFAF059', '#FFFAF000']}
                positions={[0, 0.07, 0.22, 0.65]}
              />
            </Rect>
          )}
        </Group>
        <Group>
          {molDia && <SkiaImage image={molDia} x={0} y={0} width={width} height={height} fit="cover" />}
          {molTarde && <SkiaImage image={molTarde} x={0} y={0} width={width} height={height} fit="cover" opacity={wt} />}
          {molNoite && <SkiaImage image={molNoite} x={0} y={0} width={width} height={height} fit="cover" opacity={wn} />}
        </Group>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#010911', '#01091100', '#01091100', '#010911']}
            positions={[0.066, 0.356, 0.647, 1]}
          />
        </Rect>
      </Canvas>
      {!loaded && <Text style={styles.loading}>Preparando a janela…</Text>}
      {showMeter && !!meterText && <Text style={styles.meter}>{meterText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  view: { overflow: 'hidden', backgroundColor: '#010911', borderRadius: 22, alignSelf: 'center' },
  meter: {
    position: 'absolute',
    left: 10,
    top: 10,
    color: '#9BE38B',
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#000000AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loading: { position: 'absolute', alignSelf: 'center', top: '48%', color: '#FFFFFF99', fontSize: 13 },
});
