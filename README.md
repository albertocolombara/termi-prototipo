# Termi · protótipo técnico

Protótipo para validar, no Android, o que o app vai ter de verdade:

1. **Janela real**: o mesmo shader da "Janela ao vivo · com Blender", portado para Skia. Vista lateral, assento atrás da asa; asa e moldura renderizadas no Blender (dia, entardecer, noite); terra Landsat 30 m (NASA WELD) em blocos em volta do avião; cidades à noite (GMIS + Black Marble); nuvens de satélite (NOAA-20, 16/11/2026).
2. **Serviço de bordo = Pomodoro**: a cada X min de foco, uma pausa de Y min. Avisos agendados no embarque (funcionam com o app fechado). O pouso não muda de horário.
3. **Sem punição por sair do app.** Quem quiser sair do voo toca em "Desembarcar".

Voo Barcelona → Londres (os blocos Landsat empacotados cobrem esse trajeto), na velocidade real.

## Como instalar
Cada push na `main` gera um APK em **Releases**.

## Estrutura
- `App.tsx`: telas, voo e serviço de bordo
- `src/janela/`: janela (shader SkSL, blocos Landsat, rota e sol)
- `assets/janela/`: renders do Blender, mapas base e pacotes de blocos
- `modules/screen-state`: notificação fixa com contagem regressiva (Kotlin)
