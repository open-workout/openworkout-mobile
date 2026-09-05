# OpenWorkout

**OpenWorkout** is a free, open-source workout tracking app for Android. Build a training split, log your sets, and let the app suggest progressive overload as you get stronger — all stored locally on your device.

Website: [openworkout.org](https://openworkout.org)

## Features

- **Custom training splits** — organize workouts into days (e.g. Push/Pull/Legs) and assign exercises to each.
- **Routines** — reusable workout templates you can start with one tap.
- **Workout logging** — track sets, reps, and weight as you train.
- **Progressive overload suggestions** — get hints on when to increase weight or reps based on your history.
- **Stats & recent activity** — review past workouts and exercise trends.
- **Offline-first** — all data is stored locally with SQLite, no account or internet connection required.

## Tech stack

- [Expo](https://expo.dev) / [React Native](https://reactnative.dev) with the [Expo Router](https://docs.expo.dev/router/introduction/) file-based navigation
- [NativeWind](https://www.nativewind.dev) (Tailwind CSS for React Native)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local persistence
- TypeScript
- Jest + Testing Library for tests

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended)
- npm
- [Expo Go](https://expo.dev/go) app on your phone, or an Android simulator, to run the app

### Installation

```bash
npm install
```

### Running the app

```bash
npm start
```

This starts the Expo dev server. From there you can open the app on:

- An iOS simulator (`npm run ios`)
- An Android emulator (`npm run android`)
- The web (`npm run web`)
- Your own device via the Expo Go app, by scanning the QR code

## Project structure

```
app/
  (tabs)/        Tab screens: home, routines, stats, explore, profile
  components/    Reusable UI components
  db/            SQLite data access layer (exercises, routines, sets, splits, workouts)
  lib/           Workout generation and progressive overload logic
  hooks/         Custom React hooks
  constants/     App-wide constants
```

## Exercise media

`assets/exercises/media/thumbnails/` and `assets/exercises/media/animations/` hold the exercise thumbnail images and animations. These are licensed and **not committed to git** (see `.gitignore`) - the project is open source, but this media isn't.

To build the app locally you need those files on disk yourself (get them from wherever you keep the licensed set), named `<csvId>-<anything>.<ext>` per exercise (IDs come from the `csvId` field in `app/constants/exercisesCsv.json`). After adding or removing files, regenerate the bundler map:

```bash
npm run generate:exercise-media
```

This writes `app/constants/exerciseMedia.generated.ts` (committed - it's just `require()` calls, no binaries), which is what actually lets Metro bundle the files into the app despite them being gitignored. If a file referenced there is missing on disk, bundling will fail with a clear "module not found" error.

`.easignore` mirrors `.gitignore` but deliberately does **not** exclude `assets/exercises/media/`, so `eas build` still uploads it for cloud builds even though it's gitignored.

## Scripts

| Command              | Description                       |
| --------------------- | ---------------------------------- |
| `npm start`           | Start the Expo dev server           |
| `npm run android`     | Run on an Android emulator/device   |
| `npm run ios`         | Run on an iOS simulator/device      |
| `npm run web`         | Run in a web browser                |
| `npm run lint`        | Lint the project                    |
| `npm test`            | Run the test suite                  |
| `npm run test:watch`  | Run tests in watch mode             |

## Contributing

Issues and pull requests are welcome. If you're planning a larger change, please open an issue first to discuss what you'd like to change.

## License

MIT — see [LICENSE](./LICENSE).
