import React from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'link';
export type ButtonSize = 'large' | 'medium' | 'small';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** primary = amarelo; secondary = superfície translúcida (small = contorno); link = só texto. */
  variant?: ButtonVariant;
  /** large = rótulo à esquerda + ícone à direita; medium = centralizado; small = compacto (secondary). */
  size?: ButtonSize;
  /** Ícone à direita no tamanho large. Padrão: seta. `null` remove. */
  icon?: IconName | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Button (Figma: Button · Type × Size).
 * Primary Large é o CTA de rodapé; Primary Medium o CTA de bottom sheet;
 * Secondary Small a ação discreta sobre o voo (ex.: "Pousar antes"); Link a ação alternativa.
 */
export function Button({ label, variant = 'primary', size = 'large', icon = 'arrowRight', disabled, style, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isLink = variant === 'link';
  const isOutline = variant === 'secondary' && size === 'small';
  const fg = isPrimary ? C.text.onAccent : C.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={size === 'small' || isLink ? hitSlop : undefined}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isLink ? styles.link : isOutline ? styles.outline : size === 'large' ? styles.large : styles.medium,
        !isLink && !isOutline && { backgroundColor: isPrimary ? C.accent.default : C.surface.strong },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text variant="Body/Large Medium 16" style={{ color: fg }} underline numberOfLines={1}>
        {label}
      </Text>
      {size === 'large' && !isLink && !isOutline && icon ? (
        <View accessibilityElementsHidden importantForAccessibility="no">
          <Icon name={icon} color={fg} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center' },
  large: { justifyContent: 'space-between', gap: space[14], padding: space[16], minHeight: 56 },
  medium: { justifyContent: 'center', paddingVertical: 18, minHeight: 56 },
  outline: {
    alignSelf: 'flex-start',
    gap: space[6],
    paddingVertical: space[8],
    paddingHorizontal: space[12],
    borderWidth: 1,
    borderColor: C.border.strong,
    borderRadius: radius.md,
  },
  link: { alignSelf: 'flex-start', paddingVertical: space[12] },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
