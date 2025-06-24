import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { analytics } from '@/services/analytics';

interface AudioPlayerProps {
    audioUrl: string;
    imageUrl?: string;
    title?: string;
    disabled?: boolean;
}

export interface AudioPlayerRef {
    playSound: () => Promise<void>;
    stopSound: () => Promise<void>;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ audioUrl, imageUrl, title, disabled }, ref) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hasDuration, setHasDuration] = useState(false);
    const { colors } = useTheme();

    const SKIP_DURATION = 5000; // 5 seconds in milliseconds

    useImperativeHandle(ref, () => ({
        playSound: async () => {
            if (!disabled) {
                await playSound();
            }
        },
        stopSound: async () => {
            await stopSound();
        }
    }));

    useEffect(() => {
        // Configure audio session
        async function configureAudioSession() {
            //console.log('[AudioPlayer] Configuring audio session...');
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
                //console.log('[AudioPlayer] Audio session configured successfully');
            } catch (error) {
                console.error('[AudioPlayer] Error configuring audio session:', error);
            }
        }
        configureAudioSession();

        return sound
            ? () => {
                //console.log('[AudioPlayer] Cleaning up sound...');
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    // Log when props change
    useEffect(() => {
        //console.log('[AudioPlayer] Props updated:', { audioUrl, imageUrl, title });
    }, [audioUrl, imageUrl, title]);

    function formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async function playSound() {
        try {
            setIsLoading(true);
            setHasDuration(false);
            //console.log('[AudioPlayer] Loading state set to true');

            // Unload existing sound if any
            if (sound) {
                //console.log('[AudioPlayer] Unloading existing sound');
                await sound.unloadAsync();
            }

            //console.log('[AudioPlayer] Creating new sound instance...');
            // Create new sound instance
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 1.0,
                    rate: 1.0,
                    androidImplementation: 'MediaPlayer'
                },
                (status) => {
                    //console.log('[AudioPlayer] Loading status:', status);
                    if (status.isLoaded && status.durationMillis) {
                        //console.log('[AudioPlayer] Initial duration:', status.durationMillis);
                        setDuration(status.durationMillis);
                        setHasDuration(true);
                    }
                }
            );

            //console.log('[AudioPlayer] Sound instance created successfully');
            setSound(newSound);
            setIsPlaying(true);
            setIsLoading(false);

            // Log analytics event when audio starts playing
            await analytics.track('audio_started', {
                audio_url: audioUrl,
                title: title,
                platform: Platform.OS
            });

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis);

                    // Only update duration if we haven't set it yet or if we get a valid duration
                    if (!hasDuration && status.durationMillis) {
                        setDuration(status.durationMillis);
                        setHasDuration(true);
                    }

                    if (status.didJustFinish) {
                        //console.log('[AudioPlayer] Playback finished');
                        setIsPlaying(false);
                    }
                } else {
                    //console.log('[AudioPlayer] Received unloaded status:', status);
                }
            });
        } catch (error) {
            console.error('[AudioPlayer] Error playing sound:', error);
            if (error instanceof Error) {
                console.error('[AudioPlayer] Error details:', {
                    message: error.message,
                    stack: error.stack
                });
            }
            setIsLoading(false);
        }
    }

    async function stopSound() {
        if (sound) {
            //console.log('[AudioPlayer] Attempting to stop sound');
            try {
                await sound.stopAsync();
                setIsPlaying(false);
                //console.log('[AudioPlayer] Sound stopped successfully');
            } catch (error) {
                console.error('[AudioPlayer] Error stopping sound:', error);
            }
        }
    }

    async function rewindSound() {
        if (sound) {
            //console.log('[AudioPlayer] Attempting to rewind');
            try {
                const status = await sound.getStatusAsync();
                //console.log('[AudioPlayer] Current status before rewind:', status);
                if (status.isLoaded) {
                    const newPosition = Math.max(0, status.positionMillis - SKIP_DURATION);
                    await sound.setPositionAsync(newPosition);
                    //console.log('[AudioPlayer] Rewound to position:', newPosition);
                }
            } catch (error) {
                console.error('[AudioPlayer] Error rewinding sound:', error);
            }
        }
    }

    async function fastForwardSound() {
        if (sound) {
            //console.log('[AudioPlayer] Attempting to fast forward');
            try {
                const status = await sound.getStatusAsync();
                //console.log('[AudioPlayer] Current status before fast forward:', status);
                if (status.isLoaded) {
                    const newPosition = Math.min(
                        status.durationMillis || 0,
                        status.positionMillis + SKIP_DURATION
                    );
                    await sound.setPositionAsync(newPosition);
                    //console.log('[AudioPlayer] Fast forwarded to position:', newPosition);
                }
            } catch (error) {
                console.error('[AudioPlayer] Error fast forwarding sound:', error);
            }
        }
    }

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                {imageUrl && (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.image}
                            resizeMode="cover"
                            onLoadStart={() => //console.log('[AudioPlayer] Image loading started:', imageUrl)}
                            onLoad={() => //console.log('[AudioPlayer] Image loaded successfully:', imageUrl)}
                            onError={(error) => console.error('[AudioPlayer] Image loading error:', error.nativeEvent.error)}
                        />
                    </View>
                )}
                <View style={styles.controlsContainer}>
                    {title && (
                        <ThemedText style={styles.title}>{title}</ThemedText>
                    )}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${hasDuration ? (position / duration) * 100 : 0}%`,
                                        backgroundColor: colors.primary
                                    }
                                ]}
                            />
                        </View>
                        <View style={styles.timeContainer}>
                            <ThemedText style={styles.timeText}>{formatTime(position)}</ThemedText>
                            <ThemedText style={styles.timeText}>
                                {hasDuration ? formatTime(duration) : '--:--'}
                            </ThemedText>
                        </View>
                    </View>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity
                            onPress={rewindSound}
                            style={[styles.skipButton, {
                                borderColor: colors.primary,
                                opacity: disabled ? 0.5 : 1
                            }]}
                            disabled={!sound || isLoading || disabled}
                        >
                            <View style={styles.skipContent}>
                                <Ionicons
                                    name="play-back"
                                    size={16}
                                    color={colors.primary}
                                    style={styles.skipIcon}
                                />
                                <ThemedText style={[styles.skipText, { color: colors.primary }]}>
                                    5
                                </ThemedText>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={isPlaying ? stopSound : playSound}
                            style={[styles.playButton, {
                                backgroundColor: disabled ? '#ccc' : colors.primary,
                                opacity: disabled ? 0.5 : 1
                            }]}
                            disabled={isLoading || disabled}
                        >
                            {isLoading ? (
                                <Ionicons name="hourglass-outline" size={24} color={colors.text} />
                            ) : isPlaying ? (
                                <Ionicons name="pause" size={24} color={colors.text} />
                            ) : (
                                <Ionicons name="play" size={24} color={colors.text} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={fastForwardSound}
                            style={[styles.skipButton, {
                                borderColor: colors.primary,
                                opacity: disabled ? 0.5 : 1
                            }]}
                            disabled={!sound || isLoading || disabled}
                        >
                            <View style={styles.skipContent}>
                                <Ionicons
                                    name="play-forward"
                                    size={16}
                                    color={colors.primary}
                                    style={styles.skipIcon}
                                />
                                <ThemedText style={[styles.skipText, { color: colors.primary }]}>
                                    5
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 10,
        backgroundColor: '#1a2233', // Bubble effect, adjust as needed
        padding: 0,
    },
    contentContainer: {
        flexDirection: 'column', // Changed from 'row' to 'column'
        width: '100%',
        alignItems: 'stretch', // Stretch children to fill width
    },
    imageContainer: {
        width: '100%', // Full width
        aspectRatio: 3, // Adjust as needed for your image shape
        marginRight: 0, // Remove margin
        marginBottom: 12, // Add spacing below image
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    controlsContainer: {
        width: '100%', // Full width
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    progressContainer: {
        width: '100%',
        marginBottom: 12,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    skipContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipIcon: {
        marginBottom: -2,
    },
    skipText: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: -2,
    },
}); 