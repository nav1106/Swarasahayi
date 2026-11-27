# Swarasahayi (സ്വരസഹായി)

**Your voice, understood.** A voice-first assistant for Malayalam-speaking frontline workers
(fish sellers, auto drivers, salon staff, college office staff) who need to talk to customers
in English, Hindi or Tamil, and to learn the phrases they use at work.

This is a hackathon round-one prototype, not a full product.

## Run it (one command)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. No API keys and no `.env` file are needed.
Microphone access works on `localhost` and on any HTTPS address.

### Without Docker

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 32 logic tests
npm run build
```

## What it does

**Talk** (live translator). Tap the mic and speak Malayalam; the customer hears their language.
The customer taps their own mic and the reply comes back in Malayalam.

1. Speech to text in the browser (`ml-IN`, `en-IN`, `hi-IN`, `ta-IN`).
2. Confidence check: below 0.6 it asks you to repeat (and shows the alternatives to tap),
   0.6 to 0.75 it asks "Is this what you meant?", 0.75 and above it goes ahead.
3. Reviewed phrase bank first (offline, exact), then trade glossary and Manglish clean-up
   (for example `ഫ്രഷ്` becomes `fresh`, `കരിമീൻ` becomes `pearl spot`), then a translation model.
4. Number check: prices and quantities must survive translation. If a number changes,
   the translation is not spoken and the user is asked to say it again.
5. Text to speech in the customer's language, with Repeat and Slower buttons.
6. Thumbs-down on any bubble records the problem (only if the user allowed it).

**Learn** (spoken tutor). Three levels per trade (greetings, prices, negotiation). The app speaks the
English phrase, shows the Malayalam meaning and a Malayalam-script pronunciation, listens to the
user repeat it and scores it. 80% passes (rounded down) unlock the next level.

**Demo** plays a scripted conversation for the chosen trade. **Offline phrases** are tappable
cards that need no network.

## Failure handling

| Situation | What happens |
|---|---|
| Noisy or quiet room | Level meter on the mic; message asks to hold the phone closer or speak louder |
| Low confidence or nothing heard | Spoken and written "say it again", plus tap-to-choose alternatives |
| Medium confidence | "Is this what you meant?" with Yes and No |
| Malayalam written in English words | Manglish dictionary converts them before translation |
| No network or translation limit reached | Message plus the offline phrase cards open automatically |
| No voice for a language on the device | Message asks the user to read the text |
| Microphone blocked or browser unsupported | Clear message and a "Type instead" box |

## Live deployment (Vercel)

Import the repo at vercel.com/new. `vercel.json` already sets the Vite build and output. No environment variables are needed. Vercel serves HTTPS, which phones need for the microphone.

## Configuration (all optional)

Copy `.env.example` to `.env` to change the translation backend. Without it the app uses the
free keyless MyMemory endpoint (rate limited) and the offline phrase bank.

| Variable | Meaning |
|---|---|
| `VITE_TRANSLATE_API_URL` | A LibreTranslate-compatible endpoint (for example a self-hosted IndicTrans2 wrapper) |
| `VITE_TRANSLATE_API_KEY` | Key for that endpoint. It is built into the browser bundle, so prototype use only |

Speech recognition and speech output use the browser's Web Speech API, behind small adapters in
`src/lib/speech.js` and `src/lib/translate.js`, so they can later be replaced with open-source models
(IndicConformer, IndicTrans2, Indic Parler-TTS).

## Look and feel

Warm sunset-amber and cream palette with a dark mode that follows the phone by default; the toggle (auto / light / dark) is on every screen and is remembered on the device. A small original lamp-flame mascot reacts while listening, thinking and speaking. Fonts are bundled, so the app looks the same offline.

## Project layout

```
src/screens/   Welcome (consent, trade, language), Home, Talk, Learn
src/           theme.js + ThemeToggle (auto/light/dark), Mascot (lamp flame), icons, ui, index.css (design tokens)
src/lib/       speech, translate, numbers, confidence, phrases, learn, audioLevel, storage
src/data/      phrasebank.json (56 phrases), glossary.json (40 terms), manglish.json
tests/         logic tests + WCAG AA contrast test for both themes (vitest)
Dockerfile, docker-compose.yml, nginx.conf, .env.example
```

## Privacy

Swarasahayi never records or stores audio. Note: in Chrome, the Web Speech API sends speech to Google's servers for recognition, and typed or spoken text goes to the translation endpoint. The profile, theme choice, learning progress and (only with consent) correction logs stay in
the phone's `localStorage`.

## Known limits

- Works best in Chrome on Android or desktop. Malayalam recognition quality varies, especially in noise.
- Some phones have no Malayalam text-to-speech voice; the text is still shown.
- The free translation endpoint is rate limited and weaker than a fine-tuned model.
- Hindi and Tamil numbers written as words cannot be verified; they are flagged "check the number".
- Malayalam, Hindi and Tamil phrases should be reviewed by native speakers before real use.
