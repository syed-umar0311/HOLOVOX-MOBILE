/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { registerGlobals } from '@livekit/react-native';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Polyfills WebRTC globals (RTCPeerConnection, mediaDevices, etc.) that livekit-client
// expects to find on `window`/`navigator` the way a browser provides them.
registerGlobals();

AppRegistry.registerComponent(appName, () => App);
