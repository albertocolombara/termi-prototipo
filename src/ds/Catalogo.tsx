/**
 * Catálogo do design system: mostra tokens e componentes no aparelho,
 * na mesma ordem das seções do Figma (página "Design System").
 */
import React, { useState } from 'react';
import { ScrollView, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import {
  ActionRow,
  BottomSheet,
  Button,
  CheckboxItem,
  Chip,
  color,
  FirstClassSeal,
  Icon,
  IconButton,
  iconNames,
  InfoBanner,
  ListOption,
  palette,
  pixelFamilies,
  PremiumBadge,
  radius,
  screenGutter,
  SectionHeader,
  SegmentedControl,
  Slider,
  space,
  StepProgress,
  Suitcase,
  Text,
  TextField,
  ToggleRow,
  TopBar,
  typography,
  type PixelShape,
  type TypographyVariant,
} from './index';

const SOUNDS = [
  { id: 'motores', icon: 'soundEngine', title: 'Motores', desc: 'Ronco contínuo do avião em cruzeiro' },
  { id: 'ruido', icon: 'soundWhiteNoise', title: 'Ruído branco', desc: 'Som neutro para bloquear distrações' },
  { id: 'cabine', icon: 'soundCabin', title: 'Cabine', desc: 'Conversas baixas, carrinho e avisos', locked: true },
  { id: 'chuva', icon: 'soundRain', title: 'Chuva na janela', desc: 'Chuva leve batendo na fuselagem', locked: true },
] as const;

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.sectionTitle}>
        <Text variant="Display/Pixel 32" tone="accent">
          {n}
        </Text>
        <Text variant="Heading/Data 24">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="Caption/Medium 12" tone="tertiary">
      {children}
    </Text>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: value }]} />
      <Text variant="Caption/Medium 12">{name}</Text>
    </View>
  );
}

export function Catalogo({ onClose }: { onClose: () => void }) {
  const [region, setRegion] = useState('Qualquer lugar');
  const [category, setCategory] = useState('Estudo');
  const [view, setView] = useState<'janela' | 'globo'>('janela');
  const [sound, setSound] = useState('motores');
  const [volume, setVolume] = useState(0.6);
  const [announcements, setAnnouncements] = useState(true);
  const [tasks, setTasks] = useState({ a: false, b: true });
  const [goal, setGoal] = useState('Revisar o capítulo 3 de Cálculo');
  const [sheet, setSheet] = useState(false);
  const top = (RNStatusBar.currentHeight ?? 24) + 12;

  const semantic = Object.entries(color).flatMap(([group, values]) =>
    Object.entries(values).map(([k, v]) => ({ name: `${group}/${k}`, value: v as string })),
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg.app }}>
      <ScrollView contentContainerStyle={{ paddingTop: top, paddingBottom: 64 }}>
        <View style={styles.pad}>
          <TopBar title="Voltar" onBack={onClose} time="v1" step={3} />
          <View style={{ gap: space[8], marginTop: space[24] }}>
            <Text variant="Display/Pixel 32" tone="accent">
              Design system
            </Text>
            <Text variant="Body/Large 16" tone="secondary">
              Tokens e componentes do Figma em código. Toque nos controles: eles funcionam.
            </Text>
          </View>
        </View>

        <View style={styles.pad}>
          <Section n="01" title="Cores">
            <Label>Semânticas (use estas)</Label>
            <View style={styles.wrap}>
              {semantic.map((s) => (
                <Swatch key={s.name} {...s} />
              ))}
            </View>
            <Label>Primitivos</Label>
            <View style={styles.wrap}>
              {Object.entries(palette).map(([k, v]) => (
                <Swatch key={k} name={k} value={v} />
              ))}
            </View>
          </Section>

          <Section n="02" title="Tipografia">
            {(Object.keys(typography) as TypographyVariant[]).map((v) => (
              <View key={v} style={styles.typeRow}>
                <Label>{`${v} · ${typography[v].fontSize}px`}</Label>
                <Text variant={v} tone={v.startsWith('Display/Pixel') ? 'accent' : 'primary'} numberOfLines={1}>
                  {v.startsWith('Display') ? '52 min' : v.startsWith('Heading/Screen') ? 'BCN → LHR' : 'Embarque e foque até o pouso'}
                </Text>
              </View>
            ))}
            <Label>Geist Pixel · formas (pixelShape)</Label>
            {(Object.keys(pixelFamilies) as PixelShape[]).map((shape) => (
              <View key={shape} style={styles.typeRow}>
                <Label>{pixelFamilies[shape]}</Label>
                <Text variant="Display/Pixel 32" tone="accent" pixelShape={shape} numberOfLines={1}>
                  Embarque aberto
                </Text>
              </View>
            ))}
          </Section>

          <Section n="03" title="Espaçamento e raio">
            {Object.entries(space)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <View key={k} style={styles.spaceRow}>
                  <Text variant="Caption/Medium 12" tone="secondary" style={{ width: 70 }}>
                    {`space/${k}`}
                  </Text>
                  <View style={{ width: v * 6, height: 12, backgroundColor: color.accent.default, borderRadius: 2 }} />
                </View>
              ))}
            <View style={styles.wrap}>
              {Object.entries(radius)
                .filter(([k]) => k !== 'screen')
                .map(([k, v]) => (
                  <View key={k} style={{ alignItems: 'center', gap: space[6] }}>
                    <View style={[styles.radiusBox, { borderRadius: Math.min(v, 28) }]} />
                    <Label>{k}</Label>
                  </View>
                ))}
            </View>
          </Section>

          <Section n="04" title="Ícones">
            <View style={styles.wrap}>
              {iconNames.map((n) => (
                <View key={n} style={styles.iconCell}>
                  <Icon name={n} />
                  <Text variant="Caption/Regular 12" tone="tertiary" numberOfLines={1}>
                    {n}
                  </Text>
                </View>
              ))}
              <View style={styles.iconCell}>
                <Suitcase size={36} />
                <Text variant="Caption/Regular 12" tone="tertiary">
                  Suitcase
                </Text>
              </View>
            </View>
          </Section>

          <Section n="05" title="Ações">
            <Button label="Encontrar voos" onPress={() => {}} />
            <Button label="Salvar" size="medium" onPress={() => {}} />
            <Button label="Ver outros voos" variant="secondary" onPress={() => {}} />
            <Button label="Cancelar" variant="secondary" size="medium" onPress={() => {}} />
            <View style={styles.row}>
              <Button label="Pousar antes" variant="secondary" size="small" onPress={() => {}} />
              <Button label="Desabilitado" variant="secondary" size="small" disabled />
            </View>
            <Button label="Embarcar no voo mais próximo · 52 min" variant="link" onPress={() => {}} />
            <View style={styles.row}>
              <IconButton icon="speaker" accessibilityLabel="Som da cabine" onPress={() => setSheet(true)} />
              <IconButton icon="windowView" accessibilityLabel="Vista da janela" indicator />
            </View>
          </Section>

          <Section n="06" title="Seleção e entrada">
            <Label>Chip · large</Label>
            <View style={styles.row}>
              {['Qualquer lugar', 'Perto de você', 'Europa'].map((r) => (
                <Chip key={r} label={r} selected={region === r} onPress={() => setRegion(r)} />
              ))}
            </View>
            <Label>Chip · small</Label>
            <View style={styles.row}>
              {['Estudo', 'Trabalho', 'Leitura', 'Criação'].map((c) => (
                <Chip key={c} size="small" label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Label>Segmented control</Label>
            <SegmentedControl
              value={view}
              onChange={setView}
              segments={[
                { value: 'janela', label: 'Janela', icon: 'window' },
                { value: 'globo', label: 'Globo', icon: 'globe' },
              ]}
            />
            <Label>Text field</Label>
            <TextField value={goal} onChangeText={setGoal} placeholder="No que você vai focar?" />
            <Label>Checkbox item</Label>
            <CheckboxItem label="Resolver a lista 2" checked={tasks.a} onChange={(v) => setTasks((t) => ({ ...t, a: v }))} />
            <CheckboxItem label="Resumir os teoremas" checked={tasks.b} onChange={(v) => setTasks((t) => ({ ...t, b: v }))} />
            <View style={[styles.sheetPreview]}>
              <Slider label="Volume" value={volume} onChange={setVolume} />
              <ToggleRow
                title="Avisos do comandante"
                description="Decolagem, serviço de bordo, descida e pouso"
                value={announcements}
                onChange={setAnnouncements}
              />
            </View>
          </Section>

          <Section n="07" title="Conteúdo">
            <View style={{ gap: space[4] }}>
              {SOUNDS.map((s) => (
                <ListOption
                  key={s.id}
                  icon={s.icon}
                  title={s.title}
                  description={s.desc}
                  locked={'locked' in s}
                  selected={sound === s.id}
                  onPress={() => !('locked' in s) && setSound(s.id)}
                />
              ))}
            </View>
            <ActionRow title="Adicionar motivo da viagem" description="Categoria, foco e tarefas · opcional" onPress={() => setSheet(true)} />
            <InfoBanner message="O avião já está a 10.500 m sobre o oeste da França, a 570 km de Londres. Você foca até o pouso." />
            <InfoBanner type="live" title="12 voos no ar agora com essa duração" detail="O voo pode pousar alguns minutos antes ou depois." />
            <View style={styles.row}>
              <PremiumBadge />
              <FirstClassSeal />
            </View>
          </Section>

          <Section n="08" title="Navegação e estrutura">
            <Label>Top bar + step progress</Label>
            <TopBar title="Partidas" time="50min" step={2} />
            <StepProgress step={1} />
            <Label>Bottom sheet</Label>
            <Button label="Abrir bottom sheet" variant="secondary" size="medium" onPress={() => setSheet(true)} />
          </Section>
        </View>

        <View style={{ marginTop: space[16] }}>
          <SectionHeader title="Partidas" />
        </View>
      </ScrollView>

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Som da cabine"
        subtitle="Toca junto com os avisos de cada fase do voo"
        footer={<Button label="Salvar" size="medium" onPress={() => setSheet(false)} />}
      >
        {SOUNDS.slice(0, 3).map((s) => (
          <ListOption
            key={s.id}
            icon={s.icon}
            title={s.title}
            description={s.desc}
            locked={'locked' in s}
            selected={sound === s.id}
            onPress={() => !('locked' in s) && setSound(s.id)}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: screenGutter },
  section: { gap: space[16], marginTop: space[40] },
  divider: { height: 2, backgroundColor: color.accent.default },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space[12] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8], alignItems: 'center' },
  swatch: { width: 104, gap: space[4] },
  swatchChip: { height: 44, borderRadius: radius.tile, borderWidth: 1, borderColor: color.border.subtle },
  typeRow: { gap: space[2], paddingBottom: space[12], borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  spaceRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  radiusBox: { width: 56, height: 56, backgroundColor: color.surface.default, borderWidth: 1.5, borderColor: color.border.accent },
  iconCell: { width: 104, height: 72, alignItems: 'center', justifyContent: 'center', gap: space[6], borderRadius: radius.lg, backgroundColor: color.surface.subtle, paddingHorizontal: space[4] },
  sheetPreview: { gap: space[20], padding: space[16], borderRadius: radius['2xl'], backgroundColor: color.bg.sheet },
});
