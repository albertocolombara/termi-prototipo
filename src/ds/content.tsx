/** Conteúdo e ações compactas (Figma: seções 06 · Ações e 08 · Conteúdo). */
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon, Suitcase, type IconName } from './Icon';
import { Radio } from './controls';
import { Text } from './Text';
import { color as C, gold, radius, space } from './tokens';

// ───────── Superfície dourada (selos de 1ª classe) ─────────
function GoldFill({ r }: { r: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
          {gold.stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={r} ry={r} fill="url(#goldH)" />
    </Svg>
  );
}

/** Selo "1ª classe" para conteúdo premium bloqueado (Figma: Badge / Premium). */
export function PremiumBadge({ label = '1ª classe' }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <GoldFill r={radius.md} />
      <View>
        <Icon name="lock" color={gold.ink} />
      </View>
      <Text variant="Caption/Strong 12" style={styles.goldText}>
        {label}
      </Text>
    </View>
  );
}

/** Selo de assinante (Figma: Selo · Primeira classe). */
export function FirstClassSeal({ label = 'Primeira classe' }: { label?: string }) {
  return (
    <View style={styles.seal}>
      <GoldFill r={17} />
      <View style={styles.sealIcon}>
        <Icon name="termiPremium" size={18} />
      </View>
      <Text variant="Caption/Strong 12" style={[styles.goldText, { letterSpacing: 0.96, textTransform: 'uppercase' }]}>
        {label}
      </Text>
    </View>
  );
}

// ───────── Icon button ─────────
export type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  /** Ponto amarelo de novidade (ex.: vistas premium novas). */
  indicator?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Botão flutuante 44×44 sobre a vista do voo. */
export function IconButton({ icon, accessibilityLabel, onPress, indicator, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }, style]}
    >
      <Icon name={icon} />
      {indicator ? <View style={styles.indicator} /> : null}
    </Pressable>
  );
}

// ───────── List option ─────────
export type ListOptionProps = {
  icon: IconName;
  title: string;
  description?: string;
  selected?: boolean;
  /** Mostra o selo 1ª classe no lugar do rádio. */
  locked?: boolean;
  onPress?: () => void;
};

/** Opção selecionável com ícone, título, descrição e rádio (ex.: sons da cabine). */
export function ListOption({ icon, title, description, selected, locked, onPress }: ListOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, disabled: !!locked }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && { backgroundColor: C.surface.default }, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.tile}>
        <Icon name={icon} />
      </View>
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16" tone={selected ? 'primary' : 'secondary'}>
          {title}
        </Text>
        {description ? (
          <Text variant="Body/Small 13" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {locked ? <PremiumBadge /> : <Radio selected={selected} />}
    </Pressable>
  );
}

// ───────── Action row ─────────
/** Linha que abre uma etapa opcional ou um bottom sheet. */
export function ActionRow({
  title,
  description,
  icon = 'plusTile',
  onPress,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      <Icon name={icon} />
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16">{title}</Text>
        {description ? (
          <Text variant="Body/Small 13" tone="tertiary">
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" />
    </Pressable>
  );
}

// ───────── Info banner ─────────
export type InfoBannerProps =
  | { type?: 'message'; message: string }
  | { type: 'live'; title: string; detail?: string };

/** Mensagem contextual: aviso de bordo (mala) ou disponibilidade ao vivo (ponto verde). */
export function InfoBanner(props: InfoBannerProps) {
  if (props.type === 'live') {
    return (
      <View style={[styles.banner, styles.bannerLive]}>
        <View style={styles.liveDot} />
        <View style={[styles.texts, { gap: space[6] }]}>
          <Text variant="Label/Medium 14" tone="secondary">
            {props.title}
          </Text>
          {props.detail ? (
            <Text variant="Caption/Regular 12" tone="tertiary">
              {props.detail}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.banner, styles.bannerMessage]}>
      <Suitcase size={36} />
      <Text variant="Caption/Medium 12" tone="tertiary" style={{ flex: 1 }}>
        {props.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goldText: { color: gold.ink },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: gold.border,
    overflow: 'hidden',
  },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: gold.border,
    overflow: 'hidden',
  },
  sealIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: gold.ink, alignItems: 'center', justifyContent: 'center' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: C.surface.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.bg.app,
    backgroundColor: C.accent.default,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[10],
    paddingHorizontal: space[12],
    borderRadius: radius.lg,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.tile,
    backgroundColor: C.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: space[2] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[14],
    paddingHorizontal: space[16],
    borderRadius: radius.lg,
    backgroundColor: C.surface.subtle,
  },
  banner: { flexDirection: 'row', borderRadius: radius.md, backgroundColor: C.surface.subtle },
  bannerMessage: { alignItems: 'center', gap: space[10], paddingVertical: space[12], paddingHorizontal: space[16] },
  bannerLive: { alignItems: 'flex-start', gap: space[12], padding: space[20] },
  liveDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.status.success, marginTop: 4 },
});
