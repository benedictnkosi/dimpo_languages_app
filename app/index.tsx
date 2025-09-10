import { Redirect } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'has a shadow set but cannot calculate shadow efficiently'
]);

export default function Index() {
    //console.log('[ENTRY] app/index.tsx rendered');
    return <Redirect href="/(tabs)" />;
}