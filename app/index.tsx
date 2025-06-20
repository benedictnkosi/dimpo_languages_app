import { Redirect } from 'expo-router';

export default function Index() {
    console.log('[ENTRY] app/index.tsx rendered');
    return <Redirect href="/(tabs)" />;
}