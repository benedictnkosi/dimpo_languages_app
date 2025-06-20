import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useColorScheme } from 'react-native';

const SUBJECTS = [
    'Accounting',
    'Afrikaans',
    'Agricultural Management Practices',
    'Agricultural Sciences',
    'Agricultural Technology',
    'Automotive',
    'Business Studies',
    'Civil Services',
    'Civil Technology',
    'Computer Application Technology',
    'Construction',
    'Consumer Studies',
    'Dance Studies',
    'Design',
    'Digital Electronics',
    'Dramatic Arts',
    'Economics',
    'Electrical Technology',
    'Electronics',
    'Engineering Graphic and Design',
    'English',
    'Fitting and Machining',
    'Geography',
    'History',
    'Hospitality Studies',
    'Information Technology',
    'IsiNdebele',
    'IsiXhosa',
    'IsiZulu',
    'Life Orientation',
    'Life Sciences',
    'Marine Sciences',
    'Mathematical Literacy',
    'Mathematics',
    'Mechanical Technology',
    'Music',
    'Physical Sciences',
    'Power Systems',
    'Religion Studies',
    'Sepedi',
    'Sesotho',
    'Setswana',
    'Siswati',
    'South African Sign Language',
    'Technical Mathematics',
    'Technical Sciences',
    'Tourism',
    'Tshivenda',
    'Visual Arts',
    'Welding and Metalwork',
    'Woodworking',
    'Xitsonga'
] as const;

interface SubjectPickerProps {
    selectedSubject: string;
    isCustomSubject: boolean;
    onSubjectChange: (value: string) => void;
}

export function SubjectPicker({ selectedSubject, isCustomSubject, onSubjectChange }: SubjectPickerProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                📚 Subject
            </Text>
            <View style={[
                styles.pickerContainer,
                { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
            ]}>
                <Picker
                    selectedValue={isCustomSubject ? 'custom' : selectedSubject}
                    onValueChange={onSubjectChange}
                    style={[
                        styles.picker,
                        { color: isDark ? '#fff' : '#000' }
                    ]}
                    itemStyle={{
                        fontSize: 17,
                        fontWeight: '400',
                        color: isDark ? '#fff' : '#000'
                    }}
                >
                    {SUBJECTS.map((subject) => (
                        <Picker.Item
                            key={subject}
                            label={subject}
                            value={subject}
                        />
                    ))}
                    <Picker.Item label="Custom Subject" value="custom" />
                </Picker>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    pickerContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'trasn',
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    picker: {
        width: '100%',
        marginTop: Platform.OS === 'ios' ? -6 : 0,
    },
}); 