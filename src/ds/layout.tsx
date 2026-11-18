/** Navegação e estrutura (Figma: seção 09). */
import React from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color as C, hitSlop, radius, space } from './tokens';

// ───────── Step progress ─────────
/** Progresso do fluxo de embarque em etapas (padrão: 3 — Tempo → Partidas → Cartão). */
export function StepProgress({ step, total = 3, style }: { step: number; total?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.progress, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.progressBar, { backgroundColor: i < step ? C.accent.default : C.surface.inverse }]} />
      ))}
    </View>
  );
}

// ───────── Top bar ─────────
export type TopBarProps = {
  /** Nome da etapa anterior, ao lado da seta de voltar. */
  title: string;
  onBack?: () => void;
  /** Tempo de foco escolhido (ex.: "50min"). Omitir esconde. */
  time?: string;
  /** Etapa atual do fluxo; omitir esconde o progresso. */
  step?: number;
};

export function TopBar({ title, onBack, time, step }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Voltar para ${title}`} hitSlop={hitSlop} onPress={onBack} style={styles.back}>
          <Icon name="arrowLeft" />
          <Text variant="Nav/Title 20">{title}</Text>
        </Pressable>
        {time ? (
          <View style={styles.time}>
            <Icon name="timer" />
            <Text variant="Body/Large 16" tone="tertiary">
              {time}
            </Text>
          </View>
        ) : null}
      </View>
      {step ? <StepProgress step={step} /> : null}
    </View>
  );
}

// ───────── Section header ─────────
/** Faixa amarela de painel de aeroporto para títulos de lista (ex.: Partidas). Ocupa a largura da tela. */
export function SectionHeader({ title, icon = 'departures' }: { title: string; icon?: IconName }) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={24} />
      </View>
      <Text variant="Heading/Screen 32" tone="onAccent">
        {title}
      </Text>
    </View>
  );
}

// ───────── Bottom sheet ─────────
export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Ação fixa no rodapé (normalmente um <Button size="medium" />). */
  footer?: React.ReactNode;
};

/** Sheet com alça, cabeçalho e conteúdo, sobre um scrim. Toque no scrim ou "voltar" fecha. */
export function BottomSheet({ visible, onClose, title, subtitle, children, footer }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      {visible ? (
        <View style={styles.sheetRoot}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable accessibilityLabel="Fechar" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg.scrim }]} onPress={onClose} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(200)} style={styles.sheet}>
            <View style={styles.handle} />
            <View style={{ gap: space[4] }}>
              <Text variant="Heading/Sheet 22" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="Body/Medium 14" tone="tertiary">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children ? <View style={{ gap: space[4] }}>{children}</View> : null}
            {footer}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: space[10] },
  progressBar: { flex: 1, height: 2 },
  topBar: { gap: space[20] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  time: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    backgroundColor: C.accent.default,
  },
  sectionIcon: { width: 32, height: 32, backgroundColor: C.accent.on, alignItems: 'center', justifyContent: 'center' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg.sheet,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: space[12],
    paddingHorizontal: space[16],
    paddingBottom: 36,
    gap: space[16],
  },
  handle: { width: 40, height: 4, borderRadius: radius.xs, backgroundColor: C.surface.track },
});
