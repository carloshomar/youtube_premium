# HAK — YTube Clone (SQLite remoto)

Clone visual do YTube em Expo, alimentado pelos SQLites remotos (Azure Blob). O app baixa `videos.sqlite` e `channels.sqlite`, abre com `expo-sqlite` e renderiza o feed localmente.

## Rodar

**Não use Expo Go** neste projeto (SDK 57 + `expo-video` com background playback). Use **development build**.

**Não use `sudo npm start`** — isso prende a porta 8081 como root e quebra o fluxo.

```bash
# 1) Pare o Metro antigo (Ctrl+C no terminal do sudo, se ainda estiver aberto)

# 2) Build + abre no simulador/device (primeira vez / nativo)
npm run ios
# ou
npm run android

# 3) Depois, só o Metro (dev-client)
npm start
```

Se a porta 8081 estiver ocupada:
```bash
npx expo start --dev-client --port 8082
```

No simulador, o app **HAK** (não Expo Go) deve abrir e carregar o JS do Metro.

### Testes

```bash
# Unitários + integração + E2E JS (obrigatório)
npm test
npm run test:coverage

# Só fluxos E2E em JS (App completo com DB mockado)
npm run test:e2e

# E2E no simulador/device (Maestro) — exige app nativo instalado
npx expo run:ios   # ou run:android
npm run test:e2e:maestro

# Tudo
npm run test:all
```

Cobertura exigida: **100% lines/functions** em `src/` (statements ≥98%, branches ≥85%).

Para **background playback** no iOS (áudio/vídeo com app em segundo plano / tela bloqueada), use um build nativo — Expo Go não aplica `UIBackgroundModes` do plugin:

```bash
npx expo run:ios
# ou
npx expo run:android
```

## Dados

| Arquivo | Uso |
|---------|-----|
| `videos.sqlite` | Feed, busca, player (`mp4_sas_url`), shorts |
| `channels.sqlite` | Aba Inscrições |

Sync em `src/data/sync.ts`: HEAD para `Content-Length` / `Last-Modified`, download sob demanda, pull-to-refresh força atualização.

## Background video

- Plugin `expo-video` com `supportsBackgroundPlayback` + `supportsPictureInPicture`
- Player: `staysActiveInBackground` + `showNowPlayingNotification`
