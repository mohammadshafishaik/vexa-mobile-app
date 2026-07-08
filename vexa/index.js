/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { NotificationService } from './src/services/NotificationService';

// Set up background message handler early
NotificationService.setBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);
