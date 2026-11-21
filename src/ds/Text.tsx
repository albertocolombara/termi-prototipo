import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { color as C, pixelFamilies, typography, type PixelShape, type TypographyVariant } from './tokens';

type TextColor = keyof typeof C.text;

export type TextProps = RNTextProps & {
  /** Estilo de texto do Figma, ex.: "Body/Large 16". */
  variant?: TypographyVariant;
  /** Cor semântica de texto. Padrão: primary. */
  tone?: TextColor;
  underline?: boolean;
  /** Só para estilos Display/Pixel: troca a forma do pixel (padrão: regular). */
  pixelShape?: PixelShape;
};

/** Texto do design system: aplica um estilo tipográfico e uma cor semântica. */
export function Text({ variant = 'Body/Large 16', tone = 'primary', underline, pixelShape, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: C.text[tone] },
        pixelShape && variant.startsWith('Display/Pixel') && { fontFamily: pixelFamilies[pixelShape] },
        underline && { textDecorationLine: 'underline' },
        style,
      ]}
    />
  );
}
