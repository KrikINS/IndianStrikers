import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indianstrikers.app',
  appName: 'IndianStrikers',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#0f172a',
      launchShowDuration: 1000,
      launchAutoHide: true,
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: true,
    }
  },
  android: {
    screenOrientation: "portrait"
  },
  ios: {
    screenOrientation: "portrait"
  }
};

export default config;
