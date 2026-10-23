# Pokey Fire — Expo starter

Cross-platform React Native / Expo prototype for Android and iOS.

## Included
- Local demo username entry (not real secure authentication)
- Card collection stored on-device
- Take a card photo or choose one from gallery
- Manually enter card name, set, raw estimate, and PSA 10 estimate
- Search the current local demo profile
- Light/dark theme and local privacy preference
- Planned $2/week subscription note (no payment integration)

## Not ready for public release yet
Secure auth, backend database, cloud photo storage, public profile/search endpoints, card recognition, verified live prices, subscription billing and cancellation/restore flows, privacy policy, terms, account deletion, moderation/support, icons/screenshots, and store testing are still required. No charges occur; card identification and prices are manual demo entries.

## Try on Android with Expo Go
1. Install Node.js LTS: https://nodejs.org/
2. Install Expo Go from Google Play on your Android phone.
3. Unzip this project, open a terminal in this folder, and run:
   `npm install`
   `npx expo install --fix`
   `npx expo start`
4. Scan the terminal QR code with Expo Go. Phone and computer should be on the same Wi-Fi. If needed, try `npx expo start --tunnel`.

## Build for Google Play
Expo Go is a preview tool, not a store app. For Google Play you need a standalone Android App Bundle (.aab).
1. Create an Expo account at https://expo.dev/
2. `npm install -g eas-cli`
3. `eas login`
4. Run `eas build:configure` and follow the prompts. Replace the placeholder EAS project ID in app.json with the generated ID, or let the setup rewrite it.
5. `eas build --platform android --profile production`
6. Test the build, then upload the .aab to Google Play Console: https://play.google.com/console/

The Android package name is `com.pokeyfire.app`; check availability before publishing. Run `npx expo install --fix` to align dependency versions with the installed Expo SDK. Store approval is not guaranteed.
