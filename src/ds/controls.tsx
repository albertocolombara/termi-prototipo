/** Controles de seleção e entrada (Figma: seção 07 · Seleção e entrada). */
import React, { useMemo, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space, typography } from './tokens';

// ───────── Chip ─────────
export type ChipProps = {
  label: string;
  selected?: boolean;
  /** large = 36 px (filtros de região); small = 32 px (categorias em sheet). */
  size?: 'large' | 'small';
  onPress?: () => void;
};

/** Filtro/categoria de seleção única. */
export function Chip({ label, selected, size = 'large', onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        size === 'large' ? styles.chipLarge : styles.chipSmall,
        { backgroundColor: selected ? C.accent.default : C.surface.default },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text variant={selected ? 'Label/Strong 14' : 'Label/Medium 14'} tone={selected ? 'onAccent' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

// ───────── Segmented control ─────────
export type Segment<T extends string> = { value: T; label: string; icon?: IconName };

/** Alterna entre vistas (ex.: Janela / Globo). Superfície translúcida para ficar sobre a vista do voo. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(s.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {s.icon ? <Icon name={s.icon} size={16} color={active ? C.accent.default : C.text.secondary} /> : null}
            <Text variant="Body/Medium 14" tone={active ? 'primary' : 'secondary'}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────── Radio ─────────
export function Radio({ selected }: { selected?: boolean }) {
  return (
    <View
      style={[
        styles.radio,
        selected ? { borderWidth: 7, borderColor: C.border.accent } : { borderWidth: 2, borderColor: C.border.control },
      ]}
    />
  );
}

// ───────── Checkbox ─────────
export function Checkbox({ checked }: { checked?: boolean }) {
  return (
    <View style={[styles.checkbox, checked && { backgroundColor: C.accent.default }]}>
      {checked ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M4 9.5 7.5 13 14 5.5" stroke={C.accent.on} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

/** Tarefa da "bagagem de mão": checkbox + rótulo, toque alterna. */
export function CheckboxItem({ label, checked, onChange }: { label: string; checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      hitSlop={hitSlop}
      onPress={() => onChange?.(!checked)}
      style={styles.checkItem}
    >
      <Checkbox checked={checked} />
      <Text variant="Body/Large 16" style={checked && styles.done}>
        {label}
      </Text>
    </Pressable>
  );
}

// ───────── Toggle ─────────
export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={hitSlop}
      onPress={() => onChange?.(!value)}
      style={[
        styles.toggle,
        { backgroundColor: value ? C.accent.default : C.surface.track, justifyContent: value ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={[styles.knob, { backgroundColor: value ? C.accent.on : C.surface.inverse }]} />
    </Pressable>
  );
}

/** Configuração com título, descrição e interruptor. */
export function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.texts}>
        <Text variant="Body/Large Medium 16">{title}</Text>
        {description ? (
          <Text variant="Body/Small 13" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

// ───────── Slider ─────────
export type SliderProps = {
  label?: string;
  /** 0 a 1. */
  value: number;
  onChange?: (v: number) => void;
  format?: (v: number) => string;
  /** Cor da borda do controle; deve ser a cor do fundo onde o slider está (padrão: bg/sheet). */
  surface?: string;
  style?: StyleProp<ViewStyle>;
};

const KNOB = 22;

export function Slider({ label, value, onChange, format = (v) => `${Math.round(v * 100)}%`, surface = C.bg.sheet, style }: SliderProps) {
  const [width, setWidth] = useState(0);

  // Recriado quando a largura ou o callback mudam; o sistema de toque usa sempre os handlers atuais.
  const pan = useMemo(() => {
    const emit = (x: number) => {
      if (width) onChange?.(Math.min(1, Math.max(0, x / width)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => emit(e.nativeEvent.locationX),
      onPanResponderMove: (e) => emit(e.nativeEvent.locationX),
    });
  }, [width, onChange]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const v = Math.min(1, Math.max(0, value));

  return (
    <View style={[styles.slider, style]}>
      {label ? (
        <View style={styles.sliderLabel}>
          <Text variant="Label/Medium 14" tone="tertiary">
            {label}
          </Text>
          <Text variant="Label/Medium 14" tone="tertiary">
            {format(v)}
          </Text>
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        style={styles.sliderHit}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: width * v }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { borderColor: surface, left: Math.max(0, Math.min(width - KNOB, width * v - KNOB / 2)) }]}
        />
      </View>
    </View>
  );
}

// ───────── Text field ─────────
export function TextField({ style, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={C.text.tertiary}
      selectionColor={C.accent.default}
      cursorColor={C.accent.default}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      style={[styles.field, focused && { borderColor: C.border.accent }, style]}
    />
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.sm, alignSelf: 'flex-start' },
  chipLarge: { paddingVertical: 9, paddingHorizontal: space[14] },
  chipSmall: { paddingVertical: 7, paddingHorizontal: space[12] },
  segmented: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.surface.strong, borderRadius: radius.md },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingVertical: space[4],
    paddingHorizontal: space[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: { backgroundColor: C.surface.sunken, borderColor: C.border.subtle },
  radio: { width: 22, height: 22, borderRadius: 11 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: C.border.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: space[10], alignSelf: 'flex-start' },
  done: { color: C.text.tertiary, textDecorationLine: 'line-through' },
  toggle: { width: 48, height: 28, borderRadius: radius.full, padding: 3, flexDirection: 'row', alignItems: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  texts: { flex: 1, gap: space[2] },
  slider: { gap: space[10] },
  sliderLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderHit: { height: KNOB, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: C.surface.track, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.accent.default },
  thumb: {
    position: 'absolute',
    top: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 3,
    backgroundColor: C.accent.default,
  },
  field: {
    ...typography['Body/Large 16'],
    color: C.text.primary,
    borderWidth: 1,
    borderColor: C.border.input,
    borderRadius: radius.md,
    padding: space[12],
  },
});
