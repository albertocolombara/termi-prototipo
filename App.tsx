import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  AppState,
  AppStateStatus,
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
import { FlightWindow } from './src/Window';
import { ROUTE, describeSun, positionAt, sunAltitude } from './src/sky';

// ───────────────────────── Regras do protótipo ─────────────────────────
const TURBULENCE_AFTER_MS = 10_000; // ~10 s fora do app
const MAX_TURBULENCE = 3;
const LOCK_WINDOW_MS = 1500; // tela desligada até 1,5 s antes de sair = bloqueio, não troca de app
const DURATIONS = [1, 3, 15, 30, 60, 120];
const STORAGE_KEY = 'termi.voo';

type Status = 'voando' | 'pousou' | 'pouso-alternativo' | 'desembarcou';
type LogEntry = { at: number; msg: string };
type Flight = {
  startAt: number;
  endAt: number;
  minutes: number;
  turbulence: number;
  status: Status;
  leftAt: number | null;
  warnId: string | null;
  landId: string | null;
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
  orange: '#F28C28',
  green: '#9BE38B',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const hhmmss = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? h + ':' : ''}${mm}:${String(ss).padStart(2, '0')}`;
};

async function setupChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('pouso', {
    name: 'Pouso',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
  });
  await Notifications.setNotificationChannelAsync('turbulencia', {
    name: 'Turbulência',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export default function App() {
  const { width } = useWindowDimensions();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [screen, setScreen] = useState<'inicio' | 'voo' | 'fim'>('inicio');
  const [minutes, setMinutes] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [fps, setFps] = useState(10);
  const [sky, setSky] = useState<'real' | 'dia' | 'por' | 'noite'>('real');
  const [showDiag, setShowDiag] = useState(true);
  const [permission, setPermission] = useState<string>('?');
  const flightRef = useRef<Flight | null>(null);
  const shake = useRef(new RNAnimated.Value(0)).current;

  // Guarda o voo na memória e no aparelho (sobrevive se o Android fechar o app).
  const commit = useCallback((f: Flight | null) => {
    flightRef.current = f;
    setFlight(f ? { ...f } : null);
    if (f) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(f)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const log = (f: Flight, msg: string) => {
    f.log = [{ at: Date.now(), msg }, ...f.log].slice(0, 80);
  };

  const doShake = useCallback(() => {
    shake.setValue(0);
    RNAnimated.sequence(
      [8, -7, 6, -5, 3, -2, 0].map((v) =>
        RNAnimated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true }),
      ),
    ).start();
  }, [shake]);

  const finish = useCallback(
    async (f: Flight, status: Status, reason: string) => {
      f.status = status;
      f.endedAt = Math.min(Date.now(), f.endAt);
      f.leftAt = null;
      log(f, reason);
      ScreenState.hideFlightNotification();
      if (f.warnId) Notifications.cancelScheduledNotificationAsync(f.warnId).catch(() => {});
      if (status !== 'pousou' && f.landId) {
        Notifications.cancelScheduledNotificationAsync(f.landId).catch(() => {});
      }
      commit(f);
      setScreen('fim');
    },
    [commit],
  );

  // Volta ao app: decide se o tempo fora vira turbulência.
  const handleReturn = useCallback(
    (f: Flight) => {
      if (f.warnId) {
        Notifications.cancelScheduledNotificationAsync(f.warnId).catch(() => {});
        f.warnId = null;
      }
      if (f.leftAt) {
        const returnAt = Date.now();
        const offAt = ScreenState.lastScreenOffAt();
        // Se a tela apagou depois de sair do app, só conta até a tela apagar.
        const end = offAt > f.leftAt ? Math.min(offAt, returnAt) : returnAt;
        const away = end - f.leftAt;
        const capped = Math.min(away, Math.max(0, f.endAt - f.leftAt));
        const secs = Math.round(capped / 1000);
        f.leftAt = null;
        if (capped >= TURBULENCE_AFTER_MS) {
          f.turbulence += 1;
          log(f, `Turbulência ${f.turbulence}/${MAX_TURBULENCE} · fora por ${secs} s`);
          doShake();
          if (f.turbulence >= MAX_TURBULENCE) {
            finish(f, 'desembarcou', 'Desembarcou: 3ª turbulência');
            return;
          }
        } else {
          log(f, `Voltou em ${secs} s · sem turbulência`);
        }
      } else {
        log(f, 'Voltou ao app');
      }
      if (Date.now() >= f.endAt) {
        finish(f, 'pousou', 'Pousou');
        return;
      }
      commit(f);
    },
    [commit, doShake, finish],
  );

  // Restaura um voo salvo ao abrir o app.
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (!raw) return;
      const f: Flight = JSON.parse(raw);
      if (f.status !== 'voando') {
        commit(f);
        return;
      }
      log(f, 'App reaberto (o sistema tinha fechado o app)');
      setScreen('voo');
      if (Date.now() >= f.endAt && !f.leftAt) {
        finish(f, 'pousou', 'Pousou com o app fechado');
        return;
      }
      ScreenState.showFlightNotification(
        `${ROUTE.from.code} → ${ROUTE.to.code} · em voo`,
        `Pouso às ${hhmm(f.endAt)}`,
        f.endAt,
      );
      handleReturn(f);
    })();
    Notifications.getPermissionsAsync().then((p) => setPermission(p.status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saída e volta do app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      const f = flightRef.current;
      if (!f || f.status !== 'voando') return;
      if (state === 'background') {
        const t = Date.now();
        const interactive = ScreenState.isInteractive();
        const offAt = ScreenState.lastScreenOffAt();
        if (!interactive || t - offAt < LOCK_WINDOW_MS) {
          log(f, 'Tela bloqueada · não conta');
          f.leftAt = null;
        } else if (ScreenState.isInCall()) {
          log(f, 'Ligação · não conta');
          f.leftAt = null;
        } else {
          f.leftAt = t;
          log(f, 'Saiu do app');
          try {
            f.warnId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `Turbulência ${f.turbulence + 1} de ${MAX_TURBULENCE}`,
                body: 'Volte para o voo para o aviso apagar.',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: TURBULENCE_AFTER_MS / 1000,
                channelId: 'turbulencia',
              },
            });
          } catch (e) {
            log(f, `Erro ao agendar aviso: ${String(e)}`);
          }
        }
        commit(f);
      } else if (state === 'active') {
        handleReturn(f);
      }
    });
    return () => sub.remove();
  }, [commit, handleReturn]);

  // Relógio da tela e pouso no horário.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      const f = flightRef.current;
      if (f && f.status === 'voando' && !f.leftAt && Date.now() >= f.endAt) {
        finish(f, 'pousou', 'Pousou');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [finish]);

  const board = async () => {
    const perm = await Notifications.requestPermissionsAsync();
    setPermission(perm.status);
    await setupChannels();
    const startAt = Date.now();
    const endAt = startAt + minutes * 60_000;
    const f: Flight = {
      startAt,
      endAt,
      minutes,
      turbulence: 0,
      status: 'voando',
      leftAt: null,
      warnId: null,
      landId: null,
      endedAt: null,
      log: [],
    };
    log(f, `Embarcou · ${minutes} min · pouso às ${hhmmss(endAt)}`);
    if (!ScreenState.available) log(f, 'Módulo nativo ausente: bloqueio de tela não é detectado');
    try {
      f.landId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Você pousou em ${ROUTE.to.city}`,
          body: `${minutes} min de foco. Abra para ver o que o voo rendeu.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endAt,
          channelId: 'pouso',
        },
      });
      log(f, `Aviso de pouso agendado para ${hhmmss(endAt)}`);
    } catch (e) {
      log(f, `Erro ao agendar pouso: ${String(e)}`);
    }
    ScreenState.showFlightNotification(
      `${ROUTE.from.code} → ${ROUTE.to.code} · em voo`,
      `Pouso às ${hhmm(endAt)}`,
      endAt,
    );
    commit(f);
    setScreen('voo');
  };

  // ───────────────────────── Telas ─────────────────────────
  const top = (RNStatusBar.currentHeight ?? 24) + 12;

  if (screen === 'inicio' || !flight) {
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <StatusBar style="light" />
        <Text style={styles.kicker}>TERMI · PROTÓTIPO TÉCNICO</Text>
        <Text style={styles.h1}>Quanto tempo de foco?</Text>
        <Text style={styles.p}>
          Voo simulado {ROUTE.from.code} → {ROUTE.to.code}. Este protótipo testa a janela, o timer
          com a tela bloqueada e a regra dos 10 s fora do app.
        </Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setMinutes(d)}
              style={[styles.chip, minutes === d && styles.chipOn]}
            >
              <Text style={[styles.chipText, minutes === d && styles.chipTextOn]}>
                {d < 60 ? `${d} min` : `${d / 60} h`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primary} onPress={board}>
          <Text style={styles.primaryText}>Embarcar</Text>
        </Pressable>
        <Text style={styles.small}>
          Notificações: {permission} · módulo nativo: {ScreenState.available ? 'ok' : 'ausente'}
        </Text>
      </View>
    );
  }

  if (screen === 'fim') {
    const focused = Math.round(((flight.endedAt ?? flight.endAt) - flight.startAt) / 60000);
    const title =
      flight.status === 'pousou'
        ? `Pousou em ${ROUTE.to.city}`
        : flight.status === 'pouso-alternativo'
          ? 'Pouso alternativo'
          : 'O voo seguiu sem você';
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <StatusBar style="light" />
        <Text style={styles.kicker}>FIM DO VOO</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.p}>
          {focused} min focados · {flight.turbulence} turbulência(s)
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

  const remaining = flight.endAt - now;
  const progress = (now - flight.startAt) / (flight.endAt - flight.startAt);
  const pos = positionAt(progress);
  const realAlt = sunAltitude(new Date(now), pos.lat, pos.lon);
  const sunAlt = sky === 'real' ? realAlt : sky === 'dia' ? 45 : sky === 'por' ? 0 : -20;
  const winH = Math.round(width * 0.95);

  return (
    <View style={[styles.root, { paddingTop: top, paddingHorizontal: 0 }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.route}>
          {ROUTE.from.code} → {ROUTE.to.code}
        </Text>
        <Text style={styles.timer}>{clock(remaining)}</Text>
        <Text style={styles.small}>Pouso às {hhmm(flight.endAt)}</Text>
      </View>

      {flight.turbulence > 0 && (
        <View style={styles.turb}>
          <Text style={styles.turbText}>
            Turbulência {flight.turbulence} de {MAX_TURBULENCE}
          </Text>
        </View>
      )}

      <RNAnimated.View style={{ transform: [{ translateX: shake }] }}>
        <FlightWindow width={width} height={winH} fps={fps} sunAlt={sunAlt} showMeter={showDiag} />
      </RNAnimated.View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Pressable
          style={styles.secondary}
          onPress={() => finish(flightRef.current!, 'pouso-alternativo', 'Pousou antes (usuário)')}
        >
          <Text style={styles.secondaryText}>Pousar antes</Text>
        </Pressable>

        <Pressable onPress={() => setShowDiag((v) => !v)}>
          <Text style={styles.link}>{showDiag ? 'Esconder diagnóstico' : 'Mostrar diagnóstico'}</Text>
        </Pressable>

        {showDiag && (
          <View style={{ gap: 12 }}>
            <Text style={styles.section}>Quadros da janela</Text>
            <View style={styles.chips}>
              {[2, 10, 30].map((v) => (
                <Pressable key={v} onPress={() => setFps(v)} style={[styles.chip, fps === v && styles.chipOn]}>
                  <Text style={[styles.chipText, fps === v && styles.chipTextOn]}>
                    {v} fps{v === 10 ? ' (padrão)' : v === 2 ? ' (economia)' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Céu</Text>
            <View style={styles.chips}>
              {(
                [
                  ['real', `Real (${describeSun(realAlt)})`],
                  ['dia', 'Dia'],
                  ['por', 'Pôr do sol'],
                  ['noite', 'Noite'],
                ] as const
              ).map(([k, label]) => (
                <Pressable key={k} onPress={() => setSky(k)} style={[styles.chip, sky === k && styles.chipOn]}>
                  <Text style={[styles.chipText, sky === k && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.section}>Como testar</Text>
            <Text style={styles.small}>
              1. Bloqueie a tela por 20 s: não deve contar.{'\n'}
              2. Vá para outro app por 15 s: deve contar turbulência.{'\n'}
              3. Vá para outro app e volte antes de 10 s: não conta.{'\n'}
              4. Bloqueie a tela até o pouso: a notificação deve tocar no horário.
            </Text>
            <Text style={styles.section}>Registro</Text>
            {flight.log.slice(0, 12).map((e, i) => (
              <Text key={i} style={styles.logLine}>
                {hhmmss(e.at)} {e.msg}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, gap: 14 },
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
  primary: {
    backgroundColor: C.yellow,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
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
  link: { color: '#FFFFFFCC', textDecorationLine: 'underline', textAlign: 'center', fontSize: 13 },
  header: { alignItems: 'center', paddingBottom: 6 },
  route: { color: C.dim, fontSize: 13, letterSpacing: 1 },
  timer: { color: C.text, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'] },
  turb: {
    alignSelf: 'center',
    backgroundColor: C.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  turbText: { color: '#1A0E00', fontWeight: '700', fontSize: 13 },
  logBox: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12 },
  logLine: { color: C.green, fontSize: 11, fontFamily: 'monospace', lineHeight: 17 },
});
