import { ThemedText } from '@/components/ThemedText';
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

function AudioButton({ audioUrls, accessibilityLabel, playbackRate = 1.2, autoPlay = false }: AudioButtonProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const queueRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);
    const [isQueueReady, setIsQueueReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function filterLocalAudio() {
            if (audioUrls) {
                const localAudio = [];
                for (const url of audioUrls) {
                    const localUri = `${FileSystem.documentDirectory}audio/${url}`;
                    try {
                        const info = await FileSystem.getInfoAsync(localUri);
                        if (info.exists) {
                            localAudio.push(localUri);
                        }
                    } catch (e) {
                        // fail silently
                    }
                }
                if (isMounted) {
                    queueRef.current = localAudio;
                    currentIndexRef.current = 0;
                    setCurrentIndex(0);
                    setIsQueueReady(true);
                }
            } else {
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

            if (playbackRate && playbackRate !== 1.2) {
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
        if (!audioUrls?.length) {
            //console.log('No audio URLs available');
            return;
        }

        // Only try to clean up if we have a loaded sound
        if (sound) {
            try {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    await sound.stopAsync();
                    await sound.unloadAsync();
                }
            } catch (error) {
                console.error('Error cleaning up sound:', error);
            }
            setSound(null);
        }

        if (isPlaying) {
            //console.log('Stopping playback');
            setIsPlaying(false);
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            return;
        }

        //console.log('Starting new playback');
        setCurrentIndex(0);
        currentIndexRef.current = 0;
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
                    console.error('Error cleaning up sound:', error);
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
                sound.unloadAsync();
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
                            playbackRate={1.2}
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