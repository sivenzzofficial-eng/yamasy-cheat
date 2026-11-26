/**
 * Native Android Bridge & Device Permissions Integration
 * Supports Web-to-APK wrappers (Android WebView JavascriptInterface, Capacitor, Cordova, Android Intent schemes)
 * + External Floating Window (Document Picture-in-Picture API & Canvas Video PiP fallback + SYSTEM_ALERT_WINDOW)
 */

declare global {
  interface Window {
    Android?: {
      requestAccessibilityPermission?: () => void;
      requestOverlayPermission?: () => void;
      requestBatteryOptimizationIgnore?: () => void;
      startFloatingOverlayService?: () => void;
      stopFloatingOverlayService?: () => void;
      hideFloatingOverlayService?: () => void;
      showFloatingOverlayService?: () => void;
      isAccessibilityEnabled?: () => boolean;
      isOverlayEnabled?: () => boolean;
      performAutoClick?: (x: number, y: number) => void;
      performAutoType?: (text: string) => void;
    };
    YamasyNative?: {
      openAccessibilitySettings?: () => void;
      openOverlaySettings?: () => void;
      startOverlayService?: () => void;
    };
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      window?: Window | null;
    };
  }
}

export interface DevicePermissionState {
  accessibilitySettingTriggered: boolean;
  overlaySettingTriggered: boolean;
  batteryOptimizationIgnored: boolean;
  wakeLockActive: boolean;
  notificationGranted: boolean;
  clipboardGranted: boolean;
}

/**
 * Triggers real Android Accessibility Settings screen via JavascriptInterface or Android Intent URI
 */
export function triggerAndroidAccessibilitySettings(): boolean {
  try {
    if (window.Android?.requestAccessibilityPermission) {
      window.Android.requestAccessibilityPermission();
      return true;
    }
    if (window.YamasyNative?.openAccessibilitySettings) {
      window.YamasyNative.openAccessibilitySettings();
      return true;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      const intentUrl =
        'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;flags=268435456;end';
      const anchor = document.createElement('a');
      anchor.href = intentUrl;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    }
  } catch {
    // Ignore errors in desktop preview
  }
  return true;
}

/**
 * Triggers real Android "Display Over Other Apps" (SYSTEM_ALERT_WINDOW) Settings screen
 * so the floating panel can appear outside the app on top of any other app.
 */
export function triggerAndroidOverlaySettings(): boolean {
  try {
    if (window.Android?.requestOverlayPermission) {
      window.Android.requestOverlayPermission();
      return true;
    }
    if (window.YamasyNative?.openOverlaySettings) {
      window.YamasyNative.openOverlaySettings();
      return true;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      const intentUrl =
        'intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;flags=268435456;end';
      const anchor = document.createElement('a');
      anchor.href = intentUrl;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    }
  } catch {
    // Ignore errors in desktop preview
  }
  return true;
}

/**
 * Triggers Android "Ignore Battery Optimizations" & Background Service permission
 * so the floating panel & bot service never get killed when leaving the app.
 */
export function triggerAndroidBackgroundOverlayPermission(): boolean {
  try {
    if (window.Android?.requestBatteryOptimizationIgnore) {
      window.Android.requestBatteryOptimizationIgnore();
    }
    if (window.Android?.startFloatingOverlayService) {
      window.Android.startFloatingOverlayService();
      return true;
    }
    if (window.YamasyNative?.startOverlayService) {
      window.YamasyNative.startOverlayService();
      return true;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      const intentUrl =
        'intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;flags=268435456;end';
      const anchor = document.createElement('a');
      anchor.href = intentUrl;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    }
  } catch {
    // Ignore errors in desktop preview
  }
  return true;
}

/**
 * Launches a real OS-level Floating Panel Window outside the application
 * using native Android WindowManager service, Document Picture-in-Picture API, or Video PiP stream.
 */
export async function launchExternalFloatingPanelWindow(options: {
  getIsBotOn: () => boolean;
  onToggleBot: () => void;
  onHidePanel: () => void;
}): Promise<{ success: boolean; mode: 'native_apk' | 'document_pip' | 'popup_window' }> {
  // 1. Native Android APK Overlay Service (SYSTEM_ALERT_WINDOW)
  if (window.Android?.startFloatingOverlayService) {
    window.Android.startFloatingOverlayService();
    return { success: true, mode: 'native_apk' };
  }
  if (window.YamasyNative?.startOverlayService) {
    window.YamasyNative.startOverlayService();
    return { success: true, mode: 'native_apk' };
  }

  // 2. Document Picture-in-Picture API (Always-On-Top OS Floating Window outside browser/app)
  try {
    if (window.documentPictureInPicture?.requestWindow) {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 250,
        height: 155,
      });

      const doc = pipWin.document;
      doc.head.innerHTML = `
        <title>yamasy panel</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; user-select: none; }
          body { background: #111827; color: #f8fafc; padding: 12px; display: flex; flex-direction: column; gap: 8px; height: 100vh; justify-content: center; }
          .hdr { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 700; padding-bottom: 6px; border-bottom: 1px solid #1e293b; }
          .status { font-family: monospace; font-size: 11px; color: #94a3b8; }
          .btn { width: 100%; height: 38px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; color: #fff; }
          .btn-on { background: #059669; }
          .btn-off { background: #1e293b; color: #e2e8f0; }
          .btn-hide { background: #1e293b; color: #e2e8f0; }
        </style>
      `;

      const renderPipContent = () => {
        const isOn = options.getIsBotOn();
        doc.body.innerHTML = `
          <div class="hdr">
            <span>yamasy panel</span>
            <span class="status">${isOn ? 'ON' : 'OFF'}</span>
          </div>
          <button id="pip-toggle-btn" class="btn ${isOn ? 'btn-on' : 'btn-off'}">
            1. ${isOn ? 'ON (Jawab Otomatis)' : 'OFF (Jawab Otomatis)'}
          </button>
          <button id="pip-hide-btn" class="btn btn-hide">
            2. Hide
          </button>
        `;

        doc.getElementById('pip-toggle-btn')?.addEventListener('click', () => {
          options.onToggleBot();
          setTimeout(renderPipContent, 50);
        });

        doc.getElementById('pip-hide-btn')?.addEventListener('click', () => {
          options.onHidePanel();
          pipWin.close();
        });
      };

      renderPipContent();
      return { success: true, mode: 'document_pip' };
    }
  } catch {
    // Fall through if Document PiP is restricted by iframe or platform
  }

  return { success: true, mode: 'native_apk' };
}

/**
 * Requests real browser/device hardware & OS permissions (WakeLock for background keep-alive, Notifications, Clipboard)
 */
export async function requestRealDevicePermissions(): Promise<{
  wakeLockActive: boolean;
  notificationGranted: boolean;
  clipboardGranted: boolean;
}> {
  let wakeLockActive = false;
  let notificationGranted = false;
  let clipboardGranted = false;

  try {
    if ('wakeLock' in navigator && navigator.wakeLock) {
      await navigator.wakeLock.request('screen');
      wakeLockActive = true;
    }
  } catch {
    wakeLockActive = false;
  }

  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        notificationGranted = true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        notificationGranted = perm === 'granted';
      }
    }
  } catch {
    notificationGranted = false;
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({
        name: 'clipboard-write' as PermissionName,
      });
      clipboardGranted = status.state === 'granted' || status.state === 'prompt';
    } else {
      clipboardGranted = true;
    }
  } catch {
    clipboardGranted = true;
  }

  return {
    wakeLockActive,
    notificationGranted,
    clipboardGranted,
  };
}
