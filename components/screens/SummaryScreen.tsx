import { ConversationResponse } from '@/utils/types'
import { useAuthStore } from '@/lib/stores/auth'
import apiClient from '@/lib/api'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../Button'
// import Gradient from '../gradient' // Temporarily disabled - Skia not needed

export default function SummaryScreen() {
    const { conversationId } = useLocalSearchParams()
    const [ conversation, setConversation ] = useState<ConversationResponse>()
    const { user } = useAuthStore();
    const [ isSaving, setIsSaving ] = useState(false);

    const router = useRouter();

    useEffect(() => {
        getSummary();
    }, []);

    async function getSummary() {
        const response = await fetch(
            `${process.env.EXPO_PUBLIC_BASE_URL}/api/conversations?conversationId=${conversationId}`
        );

        const conv: ConversationResponse = await response.json();
        setConversation(conv);
    }

    console.log('conversation', JSON.stringify(conversation, null, 2));

    async function saveAndContinue() {
        try {
            setIsSaving(true);
            
            // Save session to Laravel backend
            const response = await apiClient.post('/sessions', {
                session_type: conversation?.analysis?.call_summary_title || 'AI Conversation',
                conversation_history: conversation?.transcript || [],
                duration_seconds: conversation?.metadata?.call_duration_secs || 0,
            });

            if (response.data.success) {
                // End the session to deduct credits
                await apiClient.post(`/sessions/${response.data.session.id}/end`, {
                    duration_seconds: conversation?.metadata?.call_duration_secs || 0,
                    conversation_history: conversation?.transcript || [],
                });

                router.dismissAll();
            } else {
                Alert.alert('Error', 'Failed to save session');
            }
        } catch (error: any) {
            console.error('Error saving and continuing:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to save session');
        } finally {
            setIsSaving(false);
        }
    }

  return (
    <SafeAreaView>
    {/* <Gradient position="bottom" isSpeaking={false} /> */}
    <ScrollView
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={{ paddingHorizontal: 16 }}
    >
        {
            conversation?.status !== "done" && (
                <View style={{ gap: 16, paddingBottom: 16}}>
                    <Text style={styles.title}>We are processing your call...</Text>
                    <Text style={styles.subtitle}>This may take a few minutes...</Text>
                    <Text style={styles.caption}>You will be notified when it is ready.</Text>
                    <Text style={styles.subtitle}>Curent status: { conversation?.status }</Text>
                    <Button onPress={getSummary}>Refresh</Button>
                </View>
            )
        }

        {
            conversation?.status === "done" && (
                <View style={{ gap: 16, paddingBottom: 16}}>
                    <Text style={styles.title}>{ conversation?.analysis.call_summary_title }</Text>
                    <Text style={styles.subtitle}>{ conversation?.analysis.transcript_summary.trim() }</Text>
                    <Text style={styles.title}>Stats</Text>
                    <Text style={styles.subtitle}>{ conversation?.metadata.call_duration_secs } seconds</Text>
                    {/* tokens used */}
                    <Text style={styles.subtitle}>{ conversation?.metadata.cost } Tokens</Text>
                    <Text style={styles.subtitle}>{ new Date(conversation?.metadata.start_time_unix_secs * 1000).toLocaleString() }</Text>

                    {/* Transcript */}
                    <Text style={styles.title}>Transcript</Text>
                    <Text style={styles.subtitle}>{ conversation?.transcript.map((t) => t.message).join('\n') }</Text>
                </View>
            )
        }
        <View style={{ alignItems: "center"}}>
            <Button onPress={() => saveAndContinue()} disabled={isSaving}>{ isSaving ? 'Saving...' : 'Save and continue' }</Button>
        </View>

    </ScrollView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
    title:{
        fontSize:24,
        fontWeight: 'bold',
    },
    subtitle:{
        fontSize: 12
    },
    caption: {
        fontSize: 12,
        color: "gray"
    }
})