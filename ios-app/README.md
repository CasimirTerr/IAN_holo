# IAN on iPhone

There are two ways to put IAN on your phone.

## 1. Home Screen install (free, two minutes)

1. Open https://casimirterr.github.io/IAN_holo/app/ in **Safari** on the iPhone.
2. Tap **Share**, then **Add to Home Screen**.
3. Open IAN from the new icon. It runs full screen and keeps working offline.

## 2. Native build with Xcode and TestFlight

This wraps the same chat app in a native iOS shell using Capacitor.

**You need:** a Mac with Xcode (App Store), Node.js 20 or newer, and an Apple ID.
TestFlight also needs a paid Apple Developer Program membership ($99 a year). Without it you can
still run the app on your own iPhone from Xcode; that build expires after 7 days.

### Build it

```bash
cd ios-app
npm install @capacitor/core @capacitor/cli @capacitor/ios
npm run build          # copies the site into ios-app/www
npx cap add ios        # first time only: creates the Xcode project
npx cap sync ios
npx cap open ios       # opens Xcode
```

After you change the site, run `npm run sync` and build again in Xcode.

### Run it on your iPhone

1. In Xcode, click **App** in the left sidebar, then the **App** target, then **Signing & Capabilities**.
2. Tick **Automatically manage signing** and choose your **Team** (your Apple ID).
3. If Xcode says the bundle identifier is taken, change `com.casimirterr.ian` to something unique.
4. Plug in the iPhone, pick it in the device menu at the top, and press **Run**.
5. The first time, on the phone: **Settings → Privacy & Security → Developer Mode** on, then
   **Settings → General → VPN & Device Management** and trust your developer certificate.

### App icon

In Xcode open **App → Assets → AppIcon** and drag in `assets/icon-1024.png`.

### Send it to TestFlight

1. Join the Apple Developer Program at developer.apple.com.
2. At appstoreconnect.apple.com go to **Apps → + → New App**. Pick iOS and the same bundle identifier.
3. In Xcode set the device menu to **Any iOS Device (arm64)**, then **Product → Archive**.
4. In the Organizer window: **Distribute App → App Store Connect → Upload**.
5. Wait for the build to finish processing in App Store Connect (usually 10 to 30 minutes).
6. Under **TestFlight → Internal Testing**, add yourself as a tester.
7. Install the **TestFlight** app on the iPhone and accept the invite.

### Make the brain work inside the app

The native app loads from `capacitor://localhost`, so add that origin on the worker:

```
ALLOWED_ORIGIN = https://casimirterr.github.io,capacitor://localhost
```

Set `brain` in `config.js` before `npm run build`, or paste the worker address into
**Settings → Brain** inside the app.

Voice: reading replies out loud works in the native app. For dictation use the microphone key
on the iOS keyboard.
