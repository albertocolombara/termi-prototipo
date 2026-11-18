import { requireOptionalNativeModule } from 'expo';

type ScreenStateNative = {
  isInteractive(): boolean;
  isLocked(): boolean;
  isInCall(): boolean;
  lastScreenOffAt(): number;
  lastScreenOnAt(): number;
  showFlightNotification(title: string, text: string, endAt: number): void;
  hideFlightNotification(): void;
};

const native = requireOptionalNativeModule<ScreenStateNative>('ScreenState');

// Se o módulo nativo não existir (ex.: Expo Go), o app continua funcionando sem ele.
export const ScreenState: ScreenStateNative & { available: boolean } = {
  available: !!native,
  isInteractive: () => native?.isInteractive() ?? true,
  isLocked: () => native?.isLocked() ?? false,
  isInCall: () => native?.isInCall() ?? false,
  lastScreenOffAt: () => native?.lastScreenOffAt() ?? 0,
  lastScreenOnAt: () => native?.lastScreenOnAt() ?? 0,
  showFlightNotification: (t, x, e) => native?.showFlightNotification(t, x, e),
  hideFlightNotification: () => native?.hideFlightNotification(),
};
