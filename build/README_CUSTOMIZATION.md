*** Begin Patch
*** Add File: build/README_CUSTOMIZATION.md
+Customization applied: AO3 homepage & forced DoH for Android
+
+What changed:
+- Added android/lock_prefs/AO3LockPrefs.java to set managed prefs for homepage and DoH on first run.
+- Added a lightweight workflow .github/workflows/build_custom_android.yaml that produces a placeholder artifact (since full Chromium build isn't practical on GitHub-hosted runners).
+
+How it works:
+- AO3LockPrefs.applyLockedPrefs(context) should be invoked from Android's Application on startup (see integration instructions below).
+- The BrowserPreferences write* methods are placeholders: depending on the project's prefs API, you might need to call the actual secure prefs mechanism used in Cromite. Search for existing code that writes managed prefs and mirror that approach.
+
+Integration steps to enable in-app behavior (manual):
+1. In the Android application class (e.g., org.chromium.chrome.browser.ChromeApplication or similar), add a call in onCreate():
+   org.cromite.lockprefs.AO3LockPrefs.applyLockedPrefs(getApplicationContext());
+
+2. Rebuild the Android app. If you need a signed release, replace the keystore and secrets in the existing build workflows.
+
+Notes:
+- This patch is intentionally small and uses placeholder workflow to produce a downloadable artifact for testing. For production, integrate the preference-writing code with the project's secure prefs APIs and use the existing build_cromite.yaml with suitable self-hosted runners/images.
+
*** End Patch
