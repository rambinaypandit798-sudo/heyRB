import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heyrb.app',
  appName: 'heyrB',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
