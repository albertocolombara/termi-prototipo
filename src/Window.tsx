import React, { useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  Canvas,
  ColorShader,
  Fill,
  FillType,
  Group,
  ImageShader,
  LinearGradient,
  Path,
  RoundedRect,
  Shader,
  Skia,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

// Bloco real da NASA (Blue Marble, via GIBS) sobre o interior do Brasil.
// Se não baixar, a terra é desenhada só com ruído.
const GROUND_TILE =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/6/33/23.jpeg';

const SKSL = `
uniform float2 res;
uniform float t;
uniform float alt;
uniform float hasTex;
uniform float roll;
uniform shader ground;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p);
  float a = hash(i); float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0)); float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(float2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

half4 main(float2 fc) {
  float2 c = fc - res * 0.5;
  float cs = cos(roll); float sn = sin(roll);
  c = float2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
  float y = c.y / res.y;
  float x = c.x / res.y;
  float horizon = -0.06;

  float day = smoothstep(-6.0, 8.0, alt);
  float night = 1.0 - smoothstep(-14.0, -5.0, alt);
  float dusk = exp(-((alt - 1.0) * (alt - 1.0)) / 40.0);

  float3 zen = mix(float3(0.01, 0.02, 0.05), float3(0.18, 0.42, 0.84), day);
  float3 hor = mix(float3(0.05, 0.07, 0.15), float3(0.70, 0.84, 0.96), day);
  zen = mix(zen, float3(0.17, 0.20, 0.40), dusk * 0.7);
  hor = mix(hor, float3(0.98, 0.58, 0.32), dusk * 0.9);

  if (y < horizon) {
    float k = clamp((horizon - y) / 0.6, 0.0, 1.0);
    float3 sky = mix(hor, zen, pow(k, 0.6));
    float star = step(0.997, hash(floor(fc / 2.0)));
    sky += star * night * 0.8 * k;
    return half4(half3(sky), 1.0);
  }

  float dy = y - horizon;
  float depth = 0.35 / dy;
  float2 w = float2(x * depth, depth + t * 0.15);

  float3 g;
  if (hasTex > 0.5) {
    g = float3(ground.eval(w * 90.0).rgb);
  } else {
    g = mix(float3(0.25, 0.32, 0.18), float3(0.45, 0.40, 0.28), fbm(w * 1.5));
  }
  g *= 0.85 + 0.3 * fbm(w * 12.0);
  g *= mix(0.05, 1.0, day);
  g = mix(g, g * float3(1.1, 0.75, 0.55), dusk * 0.6);

  float city = smoothstep(0.62, 0.8, fbm(w * 3.0 + 7.0)) * step(0.55, hash(floor(w * 160.0)));
  g += night * city * float3(1.0, 0.75, 0.4) * 0.9;

  float2 cw = float2(x * depth * 0.8, depth * 0.8 + t * 0.19);
  float cl = smoothstep(0.55, 0.8, fbm(cw * 2.2));
  float3 cloud = mix(float3(0.10, 0.11, 0.16), float3(1.0), day);
  cloud = mix(cloud, float3(1.0, 0.72, 0.55), dusk * 0.6);
  g = mix(g, cloud, cl * 0.9);

  float haze = exp(-dy * 14.0);
  g = mix(g, hor, clamp(haze, 0.0, 1.0) * 0.85);
  return half4(half3(g), 1.0);
}
`;

const effect = Skia.RuntimeEffect.Make(SKSL);

const AnimatedText = Animated.createAnimatedComponent(TextInput);

type Props = {
  width: number;
  height: number;
  /** Quadros por segundo da paisagem (10 padrão, 2 economia). */
  fps: number;
  /** Altura do sol em graus. */
  sunAlt: number;
  showMeter: boolean;
};

export function FlightWindow({ width, height, fps, sunAlt, showMeter }: Props) {
  const image = useImage(GROUND_TILE);
  const t = useSharedValue(0);
  const lastDraw = useSharedValue(0);
  const uiFps = useSharedValue(60);
  const draws = useSharedValue(0);
  const drawFps = useSharedValue(0);
  const secondStart = useSharedValue(0);
  const fpsShared = useSharedValue(fps);
  useEffect(() => {
    fpsShared.value = fps;
  }, [fps, fpsShared]);

  // Atualiza a paisagem só no ritmo escolhido. Entre uma atualização e outra, a janela não redesenha.
  useFrameCallback((info) => {
    'worklet';
    const now = info.timestamp;
    const dt = info.timeSincePreviousFrame ?? 16;
    if (dt > 0) uiFps.value = uiFps.value * 0.9 + (1000 / dt) * 0.1;
    if (now - lastDraw.value >= 1000 / fpsShared.value) {
      lastDraw.value = now;
      t.value = now / 1000;
      draws.value += 1;
    }
    if (now - secondStart.value >= 1000) {
      drawFps.value = draws.value;
      draws.value = 0;
      secondStart.value = now;
    }
  });

  const uniforms = useDerivedValue(() => ({
    res: [width, height],
    t: t.value,
    alt: sunAlt,
    hasTex: image ? 1 : 0,
    roll: Math.sin(t.value * 0.05) * 0.015,
  }), [width, height, sunAlt, image]);

  const meterProps = useAnimatedProps(() => {
    const text = `tela ${Math.round(uiFps.value)} fps · janela ${drawFps.value} fps`;
    return { text, defaultValue: text } as any;
  });

  // Moldura: parede da cabine em grafite com o recorte da janela.
  const winW = width * 0.62;
  const winH = height * 0.78;
  const winX = (width - winW) / 2;
  const winY = (height - winH) / 2;
  const radius = winW * 0.42;

  const frame = useMemo(() => {
    return Skia.PathBuilder.Make()
      .addRect(Skia.XYWHRect(0, 0, width, height))
      .addRRect(Skia.RRectXY(Skia.XYWHRect(winX, winY, winW, winH), radius, radius))
      .setFillType(FillType.EvenOdd) // a janela fica vazada
      .detach();
  }, [width, height, winX, winY, winW, winH, radius]);

  if (!effect) return null;

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Fill>
          <Shader source={effect} uniforms={uniforms}>
            {image ? (
              <ImageShader image={image} tx="mirror" ty="mirror" fit="none" />
            ) : (
              <ColorShader color="black" />
            )}
          </Shader>
        </Fill>
        <Group>
          <Path path={frame} color="#23252C" />
          <Path path={frame}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={['#F28C2855', '#23252C00', '#23252C00', '#F28C2840']}
              positions={[0, 0.25, 0.75, 1]}
            />
          </Path>
          <RoundedRect
            x={winX - 6}
            y={winY - 6}
            width={winW + 12}
            height={winH + 12}
            r={radius + 6}
            color="#3A3D46"
            style="stroke"
            strokeWidth={12}
          />
          <RoundedRect
            x={winX}
            y={winY}
            width={winW}
            height={winH}
            r={radius}
            color="#00000066"
            style="stroke"
            strokeWidth={3}
          />
        </Group>
      </Canvas>
      {showMeter && (
        <AnimatedText
          editable={false}
          animatedProps={meterProps}
          style={styles.meter}
          underlineColorAndroid="transparent"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: {
    position: 'absolute',
    left: 12,
    top: 10,
    color: '#9BE38B',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#000000AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
