# Design system · Termi Focus Flights

Espelho em código da página **Design System** do Figma ([arquivo](https://www.figma.com/design/JfjmulB7Itgc59PGQBJvr5/Termi--Focus-Flights?node-id=135-7952)). Os nomes seguem o Figma para facilitar a conversa entre os dois lados.

```tsx
import { Button, Chip, Text, color, space } from './src/ds';
```

O catálogo (`Catalogo.tsx`) abre pelo link **Ver design system** no fim da tela inicial do protótipo e mostra tudo funcionando no aparelho.

## Tokens (`tokens.ts`)

| Figma | Código |
| --- | --- |
| Coleção **Primitivos** | `palette['yellow/500']` … (não use direto nos componentes) |
| Coleção **Cor** | `color.bg.app`, `color.surface.default`, `color.accent.default`, `color.text.tertiary`, `color.border.input` … |
| Coleção **Espaçamento** | `space[16]` |
| Coleção **Raio** | `radius.lg`, `radius['2xl']`, `radius.full` |
| Estilos de texto | `typography['Body/Large 16']` ou `<Text variant="Body/Large 16" />` |
| Estilos de efeito | `effects['Glow/Accent']`, `effects['Shadow/Small']` |

Letter-spacing e line-height vêm do Figma em %, e `tokens.ts` converte para pontos.

## Fontes

Embutidas no build pelo plugin do `expo-font` (`app.json`):

- **Geist** 400/500/600 (`@expo-google-fonts/geist`). Use `fontWeight` com a família `Geist`; o Android escolhe o arquivo pelo peso.
- **Geist Pixel** (`assets/fonts/geist-pixel/`, licença OFL). A fonte original é variável, com o eixo "Element Shape". Cada forma foi gerada como um arquivo estático e registrada como uma família própria, porque o RN não escolhe eixos de fonte variável de forma confiável no Android:

| Forma | Família | No código |
| --- | --- | --- |
| Regular (padrão do `Display/Pixel 32`) | `Geist Pixel` | `<Text variant="Display/Pixel 32" />` |
| Circle | `Geist Pixel Circle` | `pixelShape="circle"` |
| Grid | `Geist Pixel Grid` | `pixelShape="grid"` |
| Triangle | `Geist Pixel Triangle` | `pixelShape="triangle"` |
| Line | `Geist Pixel Line` | `pixelShape="line"` |

A forma Square ficou de fora porque é quase idêntica à Regular (fica a 1 de 100 no eixo). As 5 somam cerca de 4,2 MB no APK. Se o app usar só uma ou duas, dá para tirar as outras do `app.json` e de `pixelFamilies`.

## Componentes

| Figma | Código |
| --- | --- |
| Button (Primary/Secondary/Link × Large/Medium/Small) | `<Button variant size icon />` |
| Icon button | `<IconButton icon indicator />` |
| Chip | `<Chip size="large" | "small" selected />` |
| Segment + Segmented control | `<SegmentedControl segments value onChange />` |
| Radio, Checkbox, Checkbox item | `<Radio />`, `<Checkbox />`, `<CheckboxItem />` |
| Toggle, Toggle row | `<Toggle />`, `<ToggleRow />` |
| Slider | `<Slider value onChange />` (arrastar ou tocar) |
| Text field | `<TextField />` (borda amarela com foco) |
| List option (Selected/Default/Locked) | `<ListOption selected locked />` |
| Action row | `<ActionRow />` |
| Info banner (Message/Live status) | `<InfoBanner message />`, `<InfoBanner type="live" />` |
| Badge / Premium | `<PremiumBadge />` |
| Selo · Primeira classe | `<FirstClassSeal />` |
| Top bar + Step progress | `<TopBar title time step />`, `<StepProgress step />` |
| Section header | `<SectionHeader title />` |
| Bottom sheet | `<BottomSheet visible onClose title subtitle footer>` |
| Icon/* | `<Icon name="soundEngine" />` (30 ícones) |

## Diferenças conhecidas em relação ao Figma

- **Vidro (`Glass/Blur 12`)**: só a superfície translúcida. O desfoque de fundo precisa do `expo-blur`, que ainda não está no projeto.
- **Mala laranja**: no Figma é um traçado de bitmap que não exporta limpo. `<Suitcase />` é uma versão vetorial simplificada.
- Alguns ícones de traço (alto-falante, janela, chuva, ajuda) tiveram curvas simplificadas na conversão. O desenho é o mesmo.
- **Ainda não estão no código**: Avatar, Termi Premium (ilustrações), Menu lateral, Início/Cabeçalho, Em voo/Painéis e Paywall. São composições de tela; entram quando essas telas forem implementadas.
