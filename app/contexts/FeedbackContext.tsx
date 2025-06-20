import React, { createContext, useContext, useState } from 'react';

interface FeedbackContextType {
    isChecked: boolean;
    isCorrect: boolean | null;
    feedbackText: string | undefined;
    correctAnswer: string | undefined;
    questionId: string | number;
    setFeedback: (params: {
        isChecked: boolean;
        isCorrect: boolean | null;
        feedbackText?: string;
        correctAnswer?: string;
        questionId: string | number;
    }) => void;
    resetFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [feedbackText, setFeedbackText] = useState<string | undefined>(undefined);
    const [correctAnswer, setCorrectAnswer] = useState<string | undefined>(undefined);
    const [questionId, setQuestionId] = useState<string | number>('');

    const setFeedback = ({
        isChecked,
        isCorrect,
        feedbackText,
        correctAnswer,
        questionId,
    }: {
        isChecked: boolean;
        isCorrect: boolean | null;
        feedbackText?: string;
        correctAnswer?: string;
        questionId: string | number;
    }) => {
        setIsChecked(isChecked);
        setIsCorrect(isCorrect);
        setFeedbackText(feedbackText);
        setCorrectAnswer(correctAnswer);
        setQuestionId(questionId);
    };

    const resetFeedback = () => {
        setIsChecked(false);
        setIsCorrect(null);
        setFeedbackText(undefined);
        setCorrectAnswer(undefined);
        setQuestionId('');
    };

    return (
        <FeedbackContext.Provider
            value={{
                isChecked,
                isCorrect,
                feedbackText,
                correctAnswer,
                questionId,
                setFeedback,
                resetFeedback,
            }}
        >
            {children}
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (context === undefined) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
} 