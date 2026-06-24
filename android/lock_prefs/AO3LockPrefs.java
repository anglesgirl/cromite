*** Begin Patch
*** Add File: android/lock_prefs/AO3LockPrefs.java
+package org.cromite.lockprefs;
+
+import android.content.Context;
+import org.chromium.base.ContextUtils;
+import org.chromium.components.browser_prefs.BrowserPreferences;
+
+public class AO3LockPrefs {
+    private static final String HOMEPAGE = "https://ao3.org";
+    private static final String DOH_URL = "https://v7e373e11t.cloudflare-gateway.com/dns-query";
+
+    public static void applyLockedPrefs(Context context) {
+        try {
+            // Set homepage preference to AO3 and mark it as managed/locked.
+            BrowserPreferences.get(context).writeString("homepage", HOMEPAGE);
+
+            // Disable UI controls for homepage by writing managed pref state.
+            BrowserPreferences.get(context).writeBoolean("homepage_locked", true);
+
+            // Force secure DNS/DoH endpoint via a preference used by the network stack.
+            BrowserPreferences.get(context).writeString("secure_dns_mode", "secure" );
+            BrowserPreferences.get(context).writeString("secure_dns_templates", DOH_URL );
+        } catch (Exception e) {
+            // swallow errors to avoid crashing first run
+        }
+    }
+}
+
*** End Patch
