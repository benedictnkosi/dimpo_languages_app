import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { styles } from '@/styles/global';

interface ImageModalProps {
    visible: boolean;
    onClose: () => void;
    imageUrl: string;
}

export function ImageModal({ visible, onClose, imageUrl }: ImageModalProps) {
    const { width, height } = Dimensions.get('window');

    return (
        <Modal
            visible={visible}
            transparent={true}
            onRequestClose={onClose}
            animationType="fade"
        >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Image
                        source={require('@/assets/images/close.png')}
                        style={{ width: 24, height: 24, tintColor: '#fff' }}
                    />
                </TouchableOpacity>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={{
                            width: width * 0.9,
                            height: height * 0.7,
                            resizeMode: 'contain'
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
} 