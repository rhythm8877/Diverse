import { registerRootComponent } from 'expo';
import App from './App';

// Prevent the splash screen from auto-hiding until explicitly hidden in the app

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
