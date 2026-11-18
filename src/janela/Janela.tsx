import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PixelRatio, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  ColorMatrix,
  FilterMode,
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
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ATLAS_PX, SKSL, uniformArray } from './shader';
import { makeAtlas, AtlasState } from './tiles';
import { bearing, pos, sun } from './geo';

const effect = Skia.RuntimeEffect.Make(SKSL);
const EMPTY = Skia.Shader.MakeColor(Skia.Color('transparent'));
const OFF: [number, number, number] = [1e3, 1e3, 1];

// Qualidade: resolução da paisagem em relação à tela (as camadas do Blender ficam sempre nítidas).
export const QUALITY = [
  { label: 'Econômica', dpr: 0.75, hq: 0, near: false },
  { label: 'Normal', dpr: 1.25, hq: 1, near: true },
  { label: 'Máxima', dpr: 2, hq: 1, near: true },
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
  /** Diagnóstico: desligar camadas para achar o que pesa. */
  showLandscape: boolean;
  showOverlay: boolean;
};

export function Janela({
  width,
  progress,
  time,
  driftKm,
  fps,
  quality,
  satClouds,
  showMeter,
  showLandscape,
  showOverlay,
}: Props) {
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

  const base = useMemo(
    () => ({ bD: texShader(bD), bN: texShader(bN), dN: texShader(dN), cl: texShader(cl) }),
    [bD, bN, dN, cl],
  );

  const [near, setNear] = useState<AtlasState>({ image: null, b: OFF });
  const [mid, setMid] = useState<AtlasState>({ image: null, b: OFF });
  const [imp, setImp] = useState<AtlasState>({ image: null, b: OFF });
  const atlases = useRef<ReturnType<typeof makeAtlas>[] | null>(null);
  if (!atlases.current) {
    atlases.current = [
      makeAtlas('w10', 10, ATLAS_PX.near, setNear),
      makeAtlas('w8', 8, ATLAS_PX.mid, setMid),
      makeAtlas('i9', 9, ATLAS_PX.imp, setImp),
    ];
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
  const meter = useRef({ draws: 0, drawFps: 0, last: Date.now(), js: 0, jsFrames: 0, jsLast: Date.now() });
  const [meterText, setMeterText] = useState('');
  const [uiFps, setUiFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);
  // Quadros na tela, medidos na thread de interface (o que o usuário sente).
  const uiN = useSharedValue(0);
  const uiT = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    uiN.value += 1;
    if (info.timestamp - uiT.value >= 1000) {
      const v = Math.round((uiN.value * 1000) / (info.timestamp - uiT.value));
      uiN.value = 0;
      uiT.value = info.timestamp;
      scheduleOnRN(setUiFps, v);
    }
  }, showMeter);
  // Quadros do JavaScript (onde o app monta cada quadro da paisagem).
  useEffect(() => {
    if (!showMeter) return;
    let raf = 0;
    const loop = () => {
      const m = meter.current;
      m.jsFrames++;
      const now = Date.now();
      if (now - m.jsLast >= 1000) {
        m.js = Math.round((m.jsFrames * 1000) / (now - m.jsLast));
        m.jsFrames = 0;
        m.jsLast = now;
        setMeterText(`JS ${m.js} · paisagem ${m.drawFps} fps · ${Math.round(lw * dpr)}×${Math.round(lh * dpr)} px`);
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
    const [aNear, aMid, aImp] = atlases.current!;
    if (q.near) aNear.update(la, lo);
    aMid.update(la, lo);
    aImp.update(la, lo);
  }, [la, lo, q.near]);

  const picture = useMemo(() => {
    if (!effect || !showLandscape) return null;
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
      bNear: near.image && q.near ? near.b : OFF,
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
  }, [tick, lw, lh, quality, satClouds, base, atlasShaders, showLandscape]);

  // Beacon vermelho da fuselagem: pulso lento a cada 3,6 s, só ao entardecer e à noite.
  const bk = 0.32 * wn + 0.1 * wt;
  let beacon = 0;
  if (!reduceMotion && bk > 0.005) {
    const ph = (Date.now() % 3600) / 3600;
    beacon = ph < 0.15 ? ease(ph / 0.15) * bk : ph < 0.3 ? (1 - ease((ph - 0.15) / 0.15)) * bk : 0;
  }
  const r2 = (x: number) => Math.round(x * 50) / 50;

  return (
    <View style={[styles.view, { width, height }]}>
      <View style={{ width: lw, height: lh, transform: [{ scale }], transformOrigin: 'top left' }}>
        <Canvas style={{ width: lw, height: lh }}>{picture && <Picture picture={picture} />}</Canvas>
      </View>
      {showOverlay && (
        <Overlay width={width} height={height} wt={r2(wt)} wn={r2(wn)} beacon={r2(beacon)} glow={r2(wn * 0.75 + wt * 0.25)} />
      )}
      {!bD && <Text style={styles.loading}>Preparando a janela…</Text>}
      {showMeter && (
        <Text style={styles.meter}>
          Tela {uiFps} fps · {meterText}
        </Text>
      )}
    </View>
  );
}

/**
 * Asa e moldura do Blender. Só redesenha quando a luz muda (valores arredondados),
 * não a cada quadro da paisagem.
 */
const Overlay = memo(function Overlay({
  width,
  height,
  wt,
  wn,
  beacon,
  glow,
}: {
  width: number;
  height: number;
  wt: number;
  wn: number;
  beacon: number;
  glow: number;
}) {
  const asaDia = useImage(require('../../assets/janela/asa_dia.webp'));
  const asaTarde = useImage(require('../../assets/janela/asa_entardecer.webp'));
  const asaNoite = useImage(require('../../assets/janela/asa_noite.webp'));
  const asaBeacon = useImage(require('../../assets/janela/asa_beacon.webp'));
  const molDia = useImage(require('../../assets/janela/moldura_dia.webp'));
  const molTarde = useImage(require('../../assets/janela/moldura_entardecer.webp'));
  const molNoite = useImage(require('../../assets/janela/moldura_noite.webp'));
  const img = (image: SkImage | null, opacity = 1) =>
    image && opacity > 0.001 ? (
      <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" opacity={opacity} />
    ) : null;
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {img(asaDia)}
      {asaTarde && wt > 0.001 && (
        <SkiaImage image={asaTarde} x={0} y={0} width={width} height={height} fit="cover" opacity={wt}>
          <ColorMatrix matrix={WARM} />
        </SkiaImage>
      )}
      {img(asaNoite, wn)}
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
      {img(molDia)}
      {img(molTarde, wt)}
      {img(molNoite, wn)}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#010911', '#01091100', '#01091100', '#010911']}
          positions={[0.066, 0.356, 0.647, 1]}
        />
      </Rect>
    </Canvas>
  );
});

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
