import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface TimeSelectorProps {
    value: Date;
    onChange: (date: Date) => void;
    label: string;
    minimumDate?: Date;
    is24Hour?: boolean;
}

export function TimeSelector({
    value,
    onChange,
    label,
    minimumDate,
    is24Hour = true
}: TimeSelectorProps) {
    const [showPicker, setShowPicker] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            // Ensure time is within 08:00-16:00 range
            const hours = selectedDate.getHours();
            if (hours < 8) {
                selectedDate.setHours(8, 0, 0, 0);
            } else if (hours > 16) {
                selectedDate.setHours(16, 0, 0, 0);
            }
            onChange(selectedDate);
        }
    };

    return (
        <View style={styles.inputContainer}>
            <Text style={[
                styles.label,
                { color: isDark ? Colors.dark.text : Colors.light.text }
            ]}>
                {label}
            </Text>
            <TouchableOpacity
                style={[
                    styles.timeButton,
                    {
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                    }
                ]}
                onPress={() => setShowPicker(true)}
            >
                <Text style={[
                    styles.timeText,
                    { color: isDark ? Colors.dark.text : Colors.light.text }
                ]}>
                    {format(value, 'HH:mm')}
                </Text>
                <Ionicons
                    name="time-outline"
                    size={20}
                    color={isDark ? Colors.dark.text : Colors.light.text}
                />
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={value}
                    mode="time"
                    is24Hour={is24Hour}
                    display="spinner"
                    minuteInterval={5}
                    minimumDate={minimumDate}
                    onChange={handleTimeChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    timeButton: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    timeText: {
        fontSize: 16,
    },
}); 