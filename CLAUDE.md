# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

- `npm install` — instala as dependências (Next 16.4.6, React 19.2.0).
- `npm run dev` — servidor de desenvolvimento em http://localhost:3000.
- `npm run build` — build de produção.
- `npm start` — serve o build gerado (requer `npm run build` antes).

Não há lint nem suíte de testes configurados. Para verificar mudanças, rode `npm run dev` e teste no navegador.

## Antes de escrever código Next.js

O `AGENTS.md` avisa que esta versão do Next tem mudanças que podem não bater com o que se conhece. Consulte `node_modules/next/dist/docs/` antes de escrever código de app/rotas/config. O bloco `nextjs-agent-rules` do `AGENTS.md` é gerado pelo `next dev`; não remova.

## Arquitetura

App Router do Next.js em JavaScript puro (sem TypeScript). Quase toda a lógica está em um único componente cliente, com o estado isolado num reducer puro.

- `app/layout.js` — layout raiz: `lang="pt-BR"`, fontes Instrument_Sans e JetBrains_Mono via `next/font/google` expostas como `--font-sans` e `--font-mono`, e `app/globals.css`. Define o `metadata`.
- `app/page.js` — renderiza apenas `PomodoroTimer`.
- `components/PomodoroTimer.js` (`'use client'`) — toda a interface. Os estilos são objetos `style` inline, não classes; as únicas classes são `.pomo-btn` e `.pomo-run` em `app/globals.css` (hover e active).
- `lib/timer.js` — constantes, `INITIAL_STATE`, e `timerReducer`, o reducer com todas as ações (`tick`, `toggleRun`, `skip`, `setMode`, `addTask`, `load`, etc.). É onde mora a regra de negócio.
- `lib/theme.js` — `getTheme(variant, mode)` devolve as cores do tema. A cor de cada modo vem de `modeColor` (oklch com matiz fixo por modo). O componente usa fixo `VARIANT = 'noite'`; as variantes `imersivo` e `papel` existem mas não são usadas.

### Fluxo do timer

- O componente dispara `tick` a cada `TICK_MS` (250 ms). O reducer calcula o tempo decorrido por diferença de `Date.now()` em relação a `state.last`, não por contagem de ticks.
- `finish(state, natural, now)` troca o modo: após `durations.every` ciclos de foco entra a pausa longa, senão a curta. Só o término natural soma em `todayCount`/`todayMinutes` e avança o `done_p` da tarefa ativa; `skip` avança o ciclo sem contar.
- `running` após o término é `natural && autoStart`. O alarme é um `beeps` incrementado no reducer; o `useEffect` que observa `beeps` toca o som via Web Audio.

### Persistência

- `localStorage` na chave `pomodoro-v1`. `persistableState` remove as chaves em `TRANSIENT_KEYS`; o que sobra é salvo a cada mudança, só depois de `loaded` ser verdadeiro.
- O carregamento acontece em `useEffect` (não no render inicial), para não quebrar a hidratação do SSR. `load` faz merge com `INITIAL_STATE` e zera os contadores do dia quando `statsDay` difere de hoje.
- Mudar o formato do estado salvo exige cuidado: dados antigos vêm do `localStorage` e são mesclados sem migração.

### Efeitos colaterais no componente

Título da aba (`document.title`), Fullscreen API ligada ao `focusMode`, atalhos de teclado (espaço, `r`, `f`, Esc) e o intervalo do relógio. Essa lógica fica em `useEffect` dentro de `PomodoroTimer`.

### Arquivo avulso

- `Pomodoro.html` na raiz é um export empacotado (manifesto `__bundler`), separado do app Next. O Next não o serve nem o importa. Não edite como se fosse código-fonte do app.

## Convenções

- Interface e comentários em português (Brasil), no mesmo tom do código existente.
- `.next/` e `node_modules/` estão no `.gitignore`.
