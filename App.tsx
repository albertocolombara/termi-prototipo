import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenState } from './modules/screen-state/src';
import { Janela, QUALITY } from './src/janela/Janela';
import { ROUTE, place, pos, progressAt } from './src/janela/geo';

// ───────────────────────── Voo e serviço de bordo ─────────────────────────
// Sair do app não tem punição. O serviço de bordo é a pausa do Pomodoro:
// a cada X min de foco, uma pausa de Y min. O pouso não muda de horário.

const DURATIONS = [3, 25, 50, 80];
const CYCLES = [
  { id: '25/5', label: '25 + 5 min', focus: 25, pause: 5 },
  { id: '50/10', label: '50 + 10 min', focus: 50, pause: 10 },
  { id: 'teste', label: 'Teste: 1 + 0,5 min', focus: 1, pause: 0.5 },
  { id: 'off', label: 'Desligado', focus: 0, pause: 0 },
];
const STORAGE_KEY = 'termi.voo.v2';

type Status = 'voando' | 'pousou' | 'desembarcou';
type Pause = { start: number; end: number };
type LogEntry = { at: number; msg: string };
type Flight = {
  startAt: number;
  endAt: number;
  minutes: number;
  cycleId: string;
  pauses: Pause[];
  status: Status;
  endedAt: number | null;
  log: LogEntry[];
};

const C = {
  bg: '#0E0F13',
  card: '#181A20',
  border: '#2A2D36',
  text: '#FFFFFF',
  dim: '#FFFFFFB3',
  faint: '#FFFFFF66',
  yellow: '#FFC93C',
  green: '#9BE38B',
  blue: '#7FB2FF',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const hhmmss = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(ss).padStart(2, '0')}`;
};

function planPauses(startAt: number, endAt: number, focus: number, pause: number): Pause[] {
  if (!focus || !pause) return [];
  const out: Pause[] = [];
  let t = startAt + focus * 60_000;
  // Sem pausa colada no pouso: precisa sobrar pelo menos 1 min de foco depois dela.
  while (t + pause * 60_000 + 60_000 <= endAt) {
    out.push({ start: t, end: t + pause * 60_000 });
    t += (pause + focus) * 60_000;
  }
  return out;
}

const pauseAt = (f: Flight, t: number) => f.pauses.find((p) => t >= p.start && t < p.end) ?? null;
const pausedMs = (f: Flight, until: number) =>
  f.pauses.reduce((sum, p) => sum + Math.max(0, Math.min(until, p.end) - p.start), 0);

async function setupChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('pouso', {
    name: 'Pouso',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
  });
  await Notifications.setNotificationChannelAsync('servico', {
    name: 'Serviço de bordo',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export default function App() {
  const { width } = useWindowDimensions();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [screen, setScreen] = useState<'inicio' | 'voo' | 'fim'>('inicio');
  const [minutes, setMinutes] = useState(3);
  const [cycleId, setCycleId] = useState('teste');
  const [now, setNow] = useState(Date.now());
  const [confirmExit, setConfirmExit] = useState(false);
  // Diagnóstico da janela
  const [fps, setFps] = useState(10);
  const [quality, setQuality] = useState(1);
  const [satClouds, setSatClouds] = useState(true);
  const [sky, setSky] = useState<'real' | 'dia' | 'tarde' | 'noite'>('real');
  const [showDiag, setShowDiag] = useState(true);
  const [showLandscape, setShowLandscape] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const flightRef = useRef<Flight | null>(null);

  const commit = useCallback((f: Flight | null) => {
    flightRef.current = f;
    setFlight(f ? { ...f } : null);
    if (f) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(f)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const log = (f: Flight, msg: string, at = Date.now()) => {
    f.log = [{ at, msg }, ...f.log].slice(0, 80);
  };

  const finish = useCallback(
    (f: Flight, status: Status) => {
      f.status = status;
      f.endedAt = Math.min(Date.now(), f.endAt);
      log(f, status === 'pousou' ? `Pousou em ${ROUTE.to.city}` : 'Desembarcou antes do pouso');
      ScreenState.hideFlightNotification();
      if (status !== 'pousou') Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      commit(f);
      setConfirmExit(false);
      setScreen('fim');
    },
    [commit],
  );

  // Restaura o voo se o sistema fechou o app.
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (!raw) return;
      const f: Flight = JSON.parse(raw);
      flightRef.current = f;
      setFlight(f);
      if (f.status !== 'voando') {
        setScreen('fim');
        return;
      }
      log(f, 'App reaberto');
      setScreen('voo');
      if (Date.now() >= f.endAt) finish(f, 'pousou');
      else commit(f);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Relógio e pouso no horário (também ao voltar para o app).
  useEffect(() => {
    const check = () => {
      setNow(Date.now());
      const f = flightRef.current;
      if (f && f.status === 'voando' && Date.now() >= f.endAt) finish(f, 'pousou');
    };
    const id = setInterval(check, 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [finish]);

  const board = async () => {
    await Notifications.requestPermissionsAsync();
    await setupChannels();
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    const cycle = CYCLES.find((c) => c.id === cycleId)!;
    const startAt = Date.now();
    const endAt = startAt + minutes * 60_000;
    const f: Flight = {
      startAt,
      endAt,
      minutes,
      cycleId,
      pauses: planPauses(startAt, endAt, cycle.focus, cycle.pause),
      status: 'voando',
      endedAt: null,
      log: [],
    };
    log(f, `Embarcou · ${minutes} min · pouso às ${hhmmss(endAt)}`);
    log(f, f.pauses.length ? `${f.pauses.length} serviço(s) de bordo (${cycle.label})` : 'Sem serviço de bordo');

    // Tudo é agendado no embarque: funciona com o app fechado e a tela bloqueada.
    const date = (ms: number) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date: ms } as const);
    try {
      for (const p of f.pauses) {
        const pauseMin = Math.round(((p.end - p.start) / 60000) * 10) / 10;
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Serviço de bordo', body: `Pausa de ${String(pauseMin).replace('.', ',')} min. Levante, beba água.` },
          trigger: { ...date(p.start), channelId: 'servico' },
        });
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Fim do serviço de bordo', body: 'Apertem os cintos: de volta ao foco.' },
          trigger: { ...date(p.end), channelId: 'servico' },
        });
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: `Você pousou em ${ROUTE.to.city}`, body: `${minutes} min de voo. Abra para ver o que o voo rendeu.` },
        trigger: { ...date(endAt), channelId: 'pouso' },
      });
      log(f, 'Avisos agendados');
    } catch (e) {
      log(f, `Erro ao agendar avisos: ${String(e)}`);
    }
    ScreenState.showFlightNotification(`${ROUTE.from.code} → ${ROUTE.to.code} · em voo`, `Pouso às ${hhmm(endAt)}`, endAt);
    commit(f);
    setScreen('voo');
  };

  const top = (RNStatusBar.currentHeight ?? 24) + 12;
  const winW = Math.min(width - 32, 440);

  // ───────────────────────── Início ─────────────────────────
  if (screen === 'inicio' || !flight) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[styles.root, { paddingTop: top }]}>
        <StatusBar style="light" />
        <Text style={styles.kicker}>TERMI · PROTÓTIPO TÉCNICO 2</Text>
        <Text style={styles.h1}>Quanto tempo de foco?</Text>
        <Text style={styles.p}>
          Voo {ROUTE.from.city} → {ROUTE.to.city} com a janela do Blender e a terra do Landsat. Sair do app não tem
          punição.
        </Text>
        <Text style={styles.section}>Duração do voo</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <Pressable key={d} onPress={() => setMinutes(d)} style={[styles.chip, minutes === d && styles.chipOn]}>
              <Text style={[styles.chipText, minutes === d && styles.chipTextOn]}>{d} min</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Serviço de bordo (foco + pausa)</Text>
        <View style={styles.chips}>
          {CYCLES.map((c) => (
            <Pressable key={c.id} onPress={() => setCycleId(c.id)} style={[styles.chip, cycleId === c.id && styles.chipOn]}>
              <Text style={[styles.chipText, cycleId === c.id && styles.chipTextOn]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primary} onPress={board}>
          <Text style={styles.primaryText}>Embarcar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ───────────────────────── Fim ─────────────────────────
  if (screen === 'fim') {
    const end = flight.endedAt ?? flight.endAt;
    const focusMin = Math.round((end - flight.startAt - pausedMs(flight, end)) / 60000);
    const breaks = flight.pauses.filter((p) => p.start < end).length;
    return (
      <View style={[styles.root, { paddingTop: top, flex: 1, backgroundColor: C.bg }]}>
        <StatusBar style="light" />
        <Text style={styles.kicker}>FIM DO VOO</Text>
        <Text style={styles.h1}>{flight.status === 'pousou' ? `Pousou em ${ROUTE.to.city}` : 'Você desembarcou'}</Text>
        <Text style={styles.p}>
          {focusMin} min de foco · {breaks} serviço(s) de bordo
          {flight.status === 'desembarcou' ? ' · sem carimbo nem loja' : ''}
        </Text>
        <Text style={styles.section}>Registro do voo</Text>
        <ScrollView style={styles.logBox}>
          {flight.log.map((e, i) => (
            <Text key={i} style={styles.logLine}>
              {hhmmss(e.at)} {e.msg}
            </Text>
          ))}
        </ScrollView>
        <Pressable
          style={styles.primary}
          onPress={() => {
            commit(null);
            setScreen('inicio');
          }}
        >
          <Text style={styles.primaryText}>Novo voo</Text>
        </Pressable>
      </View>
    );
  }

  // ───────────────────────── Em voo ─────────────────────────
  const progress = progressAt(now, flight.startAt, flight.endAt);
  const [la, lo] = pos(progress);
  const driftKm = ((now - flight.startAt) / 3600e3) * ROUTE.speedKmh;
  const fakeHour = sky === 'dia' ? 12.6 : sky === 'tarde' ? 16.4 : sky === 'noite' ? 20.5 : null;
  const skyTime = fakeHour == null ? now : Date.UTC(2026, 10, 17) + fakeHour * 3600e3;
  const pause = pauseAt(flight, now);
  const next = flight.pauses.find((p) => p.start > now);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.route}>
          {ROUTE.from.code} → {ROUTE.to.code} · sobrevoando {place(la, lo)}
        </Text>
        <Text style={styles.timer}>{clock(flight.endAt - now)}</Text>
        <Text style={styles.small}>Pouso às {hhmm(flight.endAt)}</Text>
      </View>

      {pause ? (
        <View style={styles.service}>
          <Text style={styles.serviceTitle}>Serviço de bordo · {clock(pause.end - now)}</Text>
          <Text style={styles.serviceText}>Pausa. Levante, beba água. O pouso continua no horário.</Text>
        </View>
      ) : next ? (
        <Text style={[styles.small, { textAlign: 'center', marginBottom: 10 }]}>
          Próximo serviço de bordo em {clock(next.start - now)}
        </Text>
      ) : null}

      <Janela
        width={winW}
        progress={progress}
        time={skyTime}
        driftKm={driftKm}
        fps={fps}
        quality={quality}
        satClouds={satClouds}
        showMeter={showDiag}
        showLandscape={showLandscape}
        showOverlay={showOverlay}
      />

      <View style={{ padding: 20, gap: 14 }}>
        {confirmExit ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>Desembarcar agora?</Text>
            <Text style={styles.p}>
              Seus minutos de foco ficam salvos. Sem carimbo e sem loja de souvenir neste voo.
            </Text>
            <Pressable style={styles.primary} onPress={() => setConfirmExit(false)}>
              <Text style={styles.primaryText}>Continuar voando</Text>
            </Pressable>
            <Pressable onPress={() => finish(flightRef.current!, 'desembarcou')}>
              <Text style={styles.link}>Desembarcar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.secondary} onPress={() => setConfirmExit(true)}>
            <Text style={styles.secondaryText}>Desembarcar</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setShowDiag((v) => !v)}>
          <Text style={styles.link}>{showDiag ? 'Esconder diagnóstico' : 'Mostrar diagnóstico'}</Text>
        </Pressable>

        {showDiag && (
          <View style={{ gap: 12 }}>
            <Text style={styles.section}>Camadas (para achar o que pesa)</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setShowLandscape((v) => !v)} style={[styles.chip, showLandscape && styles.chipOn]}>
                <Text style={[styles.chipText, showLandscape && styles.chipTextOn]}>Paisagem</Text>
              </Pressable>
              <Pressable onPress={() => setShowOverlay((v) => !v)} style={[styles.chip, showOverlay && styles.chipOn]}>
                <Text style={[styles.chipText, showOverlay && styles.chipTextOn]}>Asa e moldura</Text>
              </Pressable>
            </View>
            <Text style={styles.section}>Quadros da paisagem</Text>
            <View style={styles.chips}>
              {[2, 10, 30].map((v) => (
                <Pressable key={v} onPress={() => setFps(v)} style={[styles.chip, fps === v && styles.chipOn]}>
                  <Text style={[styles.chipText, fps === v && styles.chipTextOn]}>
                    {v}
                    {v === 10 ? ' · padrão' : v === 2 ? ' · economia' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Qualidade</Text>
            <View style={styles.chips}>
              {QUALITY.map((qq, i) => (
                <Pressable key={qq.label} onPress={() => setQuality(i)} style={[styles.chip, quality === i && styles.chipOn]}>
                  <Text style={[styles.chipText, quality === i && styles.chipTextOn]}>{qq.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Céu</Text>
            <View style={styles.chips}>
              {(
                [
                  ['real', 'Hora real'],
                  ['dia', 'Dia'],
                  ['tarde', 'Entardecer'],
                  ['noite', 'Noite'],
                ] as const
              ).map(([k, label]) => (
                <Pressable key={k} onPress={() => setSky(k)} style={[styles.chip, sky === k && styles.chipOn]}>
                  <Text style={[styles.chipText, sky === k && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Nuvens</Text>
            <View style={styles.chips}>
              {(
                [
                  [true, 'Satélite (16/11)'],
                  [false, 'Geradas'],
                ] as const
              ).map(([v, label]) => (
                <Pressable key={label} onPress={() => setSatClouds(v)} style={[styles.chip, satClouds === v && styles.chipOn]}>
                  <Text style={[styles.chipText, satClouds === v && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Registro</Text>
            {flight.log.slice(0, 10).map((e, i) => (
              <Text key={i} style={styles.logLine}>
                {hhmmss(e.at)} {e.msg}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, gap: 14, paddingBottom: 30 },
  kicker: { color: C.yellow, fontSize: 12, letterSpacing: 1.5, fontWeight: '700' },
  h1: { color: C.text, fontSize: 28, fontWeight: '700' },
  p: { color: C.dim, fontSize: 15, lineHeight: 22 },
  small: { color: C.faint, fontSize: 12, lineHeight: 18 },
  section: { color: C.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipOn: { backgroundColor: C.yellow, borderColor: C.yellow },
  chipText: { color: C.text, fontSize: 13 },
  chipTextOn: { color: '#1A1300', fontWeight: '700' },
  primary: { backgroundColor: C.yellow, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#1A1300', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: C.text, fontSize: 15, fontWeight: '600' },
  link: { color: '#FFFFFFCC', textDecorationLine: 'underline', textAlign: 'center', fontSize: 14, paddingVertical: 6 },
  header: { alignItems: 'center', paddingBottom: 10, paddingHorizontal: 16 },
  route: { color: C.dim, fontSize: 13, textAlign: 'center' },
  timer: { color: C.text, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'] },
  service: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#13233D',
    borderWidth: 1,
    borderColor: '#2B4670',
    gap: 4,
  },
  serviceTitle: { color: C.blue, fontWeight: '700', fontSize: 15 },
  serviceText: { color: C.dim, fontSize: 13 },
  confirm: { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: C.border },
  confirmTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  logBox: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12 },
  logLine: { color: C.green, fontSize: 11, fontFamily: 'monospace', lineHeight: 17 },
});
