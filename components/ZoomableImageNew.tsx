import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { API_BASE_URL, IMAGE_BASE_URL } from '@/config/api';

interface Props {
    imageUrl: string;
    rotation?: number;
    onClose?: () => void;
}

function ZoomableImageNew({ imageUrl, rotation = 0, onClose }: Props) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const positionX = useSharedValue(0);
    const positionY = useSharedValue(0);
    const savedPositionX = useSharedValue(0);
    const savedPositionY = useSharedValue(0);
    const rotate = useSharedValue(rotation);

    // Update rotate value when rotation prop changes
    // Also reset position when rotation changes to prevent image from going off-screen
    useEffect(() => {
        rotate.value = rotation;
        // Reset position and scale when rotation changes to prevent image from going off-screen
        positionX.value = 0;
        positionY.value = 0;
        savedPositionX.value = 0;
        savedPositionY.value = 0;
        scale.value = 1;
        savedScale.value = 1;
    }, [rotation, rotate, positionX, positionY, savedPositionX, savedPositionY, scale, savedScale]);

    const fullImageUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${IMAGE_BASE_URL}${imageUrl}`;

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                positionX.value = savedPositionX.value + e.translationX;
                positionY.value = savedPositionY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedPositionX.value = positionX.value;
            savedPositionY.value = positionY.value;
        });

    // Add double tap gesture to close
    const tapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (onClose) {
                onClose();
            }
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: positionX.value },
            { translateY: positionY.value },
            { rotate: `${rotate.value}deg` },
            { scale: scale.value }
        ]
    }));

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composed}>
                <Animated.Image
                    source={{ uri: fullImageUrl }}
                    style={[styles.image, animatedStyle]}
                    resizeMode="contain"
                    testID="zoomable-image"
                />
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

export default ZoomableImageNew;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});