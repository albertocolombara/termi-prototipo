# Termi · protótipo técnico

Protótipo descartável para validar três riscos antes de construir o app:

1. **Janela em Skia** a 10 fps num Android fraco (céu pela altura real do sol, terra com bloco da NASA, nuvens, moldura).
2. **Timer de voo com a tela bloqueada**: notificação fixa com contagem regressiva e aviso de pouso agendado.
3. **Regra dos 10 s fora do app**, sem contar tela bloqueada nem ligação (módulo nativo em `modules/screen-state`).

Voo simulado GRU → FOR, sem dados ao vivo.

## Como instalar
Cada push na `main` gera um APK em **Releases**. Baixe no celular e instale.

## Estrutura
- `App.tsx`: telas e regras do voo
- `src/Window.tsx`: janela em Skia (shader)
- `src/sky.ts`: rota simulada e altura do sol
- `modules/screen-state`: módulo nativo Kotlin (tela, ligação, notificação fixa)
- `.github/workflows/android.yml`: build do APK
