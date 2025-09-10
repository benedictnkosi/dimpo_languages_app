import { ThemedText } from '@/components/ThemedText';
import { HOST_URL } from '@/config/api';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

interface AudioButtonProps {
    audioUrls?: string[];
    accessibilityLabel: string;
    playbackRate?: number;
    autoPlay?: boolean;
}

function AudioButton({ audioUrls, accessibilityLabel, playbackRate = 1.0, autoPlay = false }: AudioButtonProps) {
    console.log('AudioButton rendered with audioUrls:', audioUrls);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const queueRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);
    const [isQueueReady, setIsQueueReady] = useState(false);

    useEffect(() => {
        console.log('useEffect for filterLocalAudio triggered with audioUrls:', audioUrls);
        let isMounted = true;
        async function filterLocalAudio() {
            console.log('filterLocalAudio called');
            console.log('audioUrls:', audioUrls);
            if (audioUrls) {
                const localAudio = [];
                for (const url of audioUrls) {
                    const localUri = `${FileSystem.documentDirectory}audio/${url}`;
                    console.log('Checking localUri:', localUri);
                    try {
                        const info = await FileSystem.getInfoAsync(localUri);
                        console.log('File info for', url, ':', info);
                        if (info.exists) {
                            localAudio.push(localUri);
                            console.log('Added to localAudio:', localUri);
                        } else {
                            // Try to download from remote
                            const remoteUrl = `${HOST_URL}/api/word/audio/get/${url}`;
                            console.log('File does not exist, downloading from:', remoteUrl);
                            try {
                                // Ensure the audio directory exists
                                await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}audio/`, { intermediates: true });
                            } catch (e) {
                                // Directory may already exist
                            }
                            try {
                                const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
                                console.log('Downloaded file to:', downloadResult.uri);
                                localAudio.push(downloadResult.uri);
                            } catch (downloadError) {
                                console.error('Failed to download audio:', remoteUrl, downloadError);
                            }
                        }
                    } catch (e) {
                        console.error('Error checking file:', url, e);
                    }
                }
                console.log('Final localAudio array:', localAudio);
                if (isMounted) {
                    queueRef.current = localAudio;
                    currentIndexRef.current = 0;
                    setCurrentIndex(0);
                    setIsQueueReady(true);
                    console.log('Queue ready, length:', localAudio.length);
                }
            } else {
                console.log('No audioUrls provided');
                if (isMounted) {
                    queueRef.current = [];
                    setIsQueueReady(true);
                }
            }
        }
        setIsQueueReady(false); // reset before filtering
        filterLocalAudio();
        return () => { isMounted = false; };
    }, [audioUrls]);

    async function playNextInQueue() {
        if (!queueRef.current.length || currentIndexRef.current >= queueRef.current.length) {
            //console.log('Queue finished or empty');
            setIsPlaying(false);
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            if (sound) {
                try {
                    const status = await sound.getStatusAsync();
                    if (status.isLoaded) {
                        await sound.unloadAsync();
                    }
                } catch (error) {
                    console.error('Error unloading sound:', error);
                }
                setSound(null);
            }
            return;
        }

        const currentUrl = queueRef.current[currentIndexRef.current];
        try {
            //console.log('Loading sound from URL:', currentUrl);

            // Configure audio mode
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: currentUrl },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setIsPlaying(true);

            if (playbackRate) {
                await newSound.setRateAsync(playbackRate, true);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            Alert.alert(
                'Audio Playback Error',
                'Unable to play the audio file. Please try again.',
                [{ text: 'OK' }]
            );

            // Move to next item in queue
            currentIndexRef.current += 1;
            setCurrentIndex(currentIndexRef.current);

            if (currentIndexRef.current < queueRef.current.length) {
                playNextInQueue();
            } else {
                setIsPlaying(false);
                setCurrentIndex(0);
                currentIndexRef.current = 0;
                setSound(null);
            }
        }
    }

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
            //console.log('Sound finished playing');
            if (sound) {
                sound.unloadAsync();
            }
            currentIndexRef.current += 1;
            setCurrentIndex(currentIndexRef.current);

            if (currentIndexRef.current < queueRef.current.length) {
                playNextInQueue();
            } else {
                //console.log('Queue completed');
                setIsPlaying(false);
                setCurrentIndex(0);
                currentIndexRef.current = 0;
                setSound(null);
            }
        }
    };

    async function handlePlayPress() {
        console.log('handlePlayPress called');
        console.log('audioUrls:', audioUrls);
        console.log('sound:', sound);
        console.log('isPlaying:', isPlaying);
        console.log('queueRef.current:', queueRef.current);
        console.log('currentIndexRef.current:', currentIndexRef.current);
        console.log('isQueueReady:', isQueueReady);
        
        if (!audioUrls?.length) {
            console.log('No audio URLs available');
            return;
        }

        // If queue is not ready or empty, try to populate it first
        if (!isQueueReady || queueRef.current.length === 0) {
            console.log('Queue not ready or empty, attempting to populate...');
            // Force re-populate the queue
            const localAudio = [];
            for (const url of audioUrls) {
                const localUri = `${FileSystem.documentDirectory}audio/${url}`;
                console.log('Checking localUri:', localUri);
                try {
                    const info = await FileSystem.getInfoAsync(localUri);
                    console.log('File info for', url, ':', info);
                    if (info.exists) {
                        localAudio.push(localUri);
                        console.log('Added to localAudio:', localUri);
                    }
                } catch (e) {
                    console.error('Error checking file:', url, e);
                }
            }
            queueRef.current = localAudio;
            currentIndexRef.current = 0;
            setCurrentIndex(0);
            setIsQueueReady(true);
            console.log('Queue populated, length:', localAudio.length);
        }

        // Always clean up existing sound first
        if (sound) {
            try {
                const status = await sound.getStatusAsync();
                console.log('Existing sound status:', status);
                if (status.isLoaded) {
                    await sound.stopAsync();
                    await sound.unloadAsync();
                    console.log('Stopped and unloaded existing sound');
                }
            } catch (error) {
                // Only log if it's not the "not loaded" error
                if (!(error instanceof Error) || !error.message?.includes('not loaded')) {
                    console.error('Error cleaning up sound:', error);
                }
            }
            setSound(null);
        }

        // Reset all state
        setIsPlaying(false);
        setCurrentIndex(0);
        currentIndexRef.current = 0;

        // If currently playing, just stop
        if (isPlaying) {
            console.log('Stopping playback');
            return;
        }

        // Check if we have audio to play
        if (queueRef.current.length === 0) {
            console.log('No audio files available to play');
            return;
        }

        // Start new playback
        console.log('Starting new playback');
        setIsPlaying(true);
        playNextInQueue();
    }

    useEffect(() => {
        let isMounted = true;
        async function cleanupAndAutoplay() {
            // Cleanup previous sound
            if (sound) {
                try {
                    const status = await sound.getStatusAsync();
                    if (status.isLoaded) {
                        await sound.stopAsync();
                        await sound.unloadAsync();
                    }
                } catch (error) {
                    // Only log if it's not the "not loaded" error
                    if (!(error instanceof Error) || !error.message?.includes('not loaded')) {
                        console.error('Error cleaning up sound:', error);
                    }
                }
                setSound(null);
            }
            setIsPlaying(false);
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            queueRef.current = [];
        }
        cleanupAndAutoplay();
        return () => {
            isMounted = false;
            if (sound) {
                sound.unloadAsync().catch(error => {
                    // Only log if it's not the "not loaded" error
                    if (!(error instanceof Error) || !error.message?.includes('not loaded')) {
                        console.error('Error unloading sound in cleanup:', error);
                    }
                });
            }
        };
    }, [audioUrls, autoPlay]);

    // New effect: trigger auto play only when queue is ready
    useEffect(() => {
        if (isQueueReady && autoPlay && audioUrls?.length) {
            handlePlayPress();
        }
    }, [isQueueReady, autoPlay, audioUrls]);

    return (
        <Pressable
            onPress={handlePlayPress}
            style={styles.audioButton}
            accessibilityLabel={accessibilityLabel}
            disabled={!audioUrls?.length}
        >
            <ThemedText style={{ fontSize: 32, lineHeight: 48 }}>{accessibilityLabel === 'Play slow audio' ? '🐢' : '🔊'}</ThemedText>
        </Pressable>
    );
}

interface AudioPlayerProps {
    audioUrls?: string[];
    characterImage?: any;
    autoPlay?: boolean;
    showGif?: boolean;
    text?: string;
}

export function AudioPlayer({
    audioUrls,
    characterImage = require('@/assets/images/bunny-waiting.gif'),
    autoPlay = true,
    showGif = true,
    text
}: AudioPlayerProps) {
    const colorScheme = useColorScheme();
    const characterImageSource = useMemo(() => {
        if (colorScheme === 'dark') {
            return require('@/assets/images/impatient-kitty.gif');
        }
        return characterImage;
    }, [colorScheme, characterImage]);

    return (
        <View style={styles.speechBubbleRow}>
            {showGif && (
                <Image
                    source={characterImageSource}
                    style={styles.characterImage}
                    accessibilityLabel="Character"
                />
            )}
            <View style={[styles.speechBubbleContainer, !showGif && styles.speechBubbleContainerNoGif]}>
                <View style={styles.speechBubble}>
                    {text && (
                        <ThemedText style={styles.text}>{text}</ThemedText>
                    )}
                    <View style={styles.audioButtonsContainer}>
                        <AudioButton
                            audioUrls={audioUrls}
                            accessibilityLabel="Play audio"
                            playbackRate={1.0}
                            autoPlay={autoPlay}
                        />
                        <AudioButton
                            audioUrls={audioUrls}
                            accessibilityLabel="Play slow audio"
                            playbackRate={0.8}
                            autoPlay={false}
                        />
                    </View>
                </View>
                <View style={styles.speechBubbleTail} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    speechBubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 12,
        marginTop: 8,
        gap: 8,
    },
    characterImage: {
        width: 96,
        height: 96,
        marginRight: 4,
    },
    speechBubbleContainer: {
        alignItems: 'flex-start',
        flex: 1,
        marginBottom: 48,
    },
    speechBubbleContainerNoGif: {
        marginLeft: 0,
    },
    speechBubble: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
        gap: 12,
    },
    speechBubbleTail: {
        width: 0,
        height: 0,
        borderTopWidth: 12,
        borderTopColor: '#E5E7EB',
        borderLeftWidth: 0,
        borderLeftColor: 'transparent',
        borderRightWidth: 16,
        borderRightColor: 'transparent',
        marginLeft: 24,
        marginTop: -2,
    },
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    audioButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    text: {
        fontSize: 16,
        marginBottom: 8,
    },
});

export default AudioPlayer; 