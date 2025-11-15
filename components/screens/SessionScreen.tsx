import { useAuthStore } from '@/lib/stores/auth';
import { useConversation } from '@elevenlabs/react-native';
import * as Brightness from 'expo-brightness';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Button from '../Button';

export default function SessionScreen() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [isStarting, setIsStarting] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const conversation = useConversation({
        onConnect: ({ conversationId }) => {
            console.log('✅ Connected to conversation:', conversationId);
            setConversationId(conversationId);
            setIsStarting(false);
        },
        onDisconnect: () => {
            console.log('📴 Disconnected from conversation');
            setIsStarting(false);
        },
        onMessage: (message) => console.log('💬 Received message:', message),
        onError: (message: string, context?: Record<string, unknown>) => {
            console.error('❌ Conversation error:', message, context);
            setIsStarting(false);
            
            if (message.includes('could not establish pc connection')) {
                Alert.alert(
                    'Connection Error',
                    'Unable to establish WebRTC connection. This may be due to network restrictions or firewall settings. Try switching networks or using mobile data.',
                    [{ text: 'OK' }]
                );
            }
        },
        onModeChange: (mode) => console.log('🔄 Conversation mode changed:', mode),
        onStatusChange: (prop) => console.log('📊 Conversation status changed:', prop.status),
        onCanSendFeedbackChange: (prop) =>
          console.log('📝 Can send feedback changed:', prop.canSendFeedback),
        onUnhandledClientToolCall: (params) => console.log('🔧 Unhandled client tool call:', params),
        clientTools: {
            handleSetBrightness: async (parameters: unknown) => {
                const {brightnessValue} = parameters as { brightnessValue: number };
                console.log('💡 Setting brightness to:', brightnessValue);

                const { status } = await Brightness.requestPermissionsAsync();
                if (status === 'granted') {
                    await Brightness.setBrightnessAsync(brightnessValue);
                    return brightnessValue;
                }
            }
        }
    });

    const startConversation = async () => {
        if (isStarting) {
            console.log('⏳ Already starting conversation...');
            return;
        }
        
        const agentId = process.env.EXPO_PUBLIC_AGENT_ID;
        if (!agentId) {
            Alert.alert(
                'Configuration Error',
                'Agent ID is not configured. Please set EXPO_PUBLIC_AGENT_ID in your environment variables.'
            );
            console.error('❌ EXPO_PUBLIC_AGENT_ID is not set');
            return;
        }

        try {
            setIsStarting(true);
            console.log('🚀 Starting conversation with agent:', agentId);
            console.log('👤 User:', user?.name ?? "User");
            
            await conversation.startSession({
                agentId: agentId,
                dynamicVariables: {
                    user_name: user?.name ?? "User",
                }
            });
            
            console.log('✅ Conversation session started');
        } catch (error) {
            console.error('❌ Error starting conversation:', error);
            setIsStarting(false);
            
            Alert.alert(
                'Connection Error',
                `Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    const endConversation = async () => {
        try {
            console.log('🛑 Ending conversation...');
            await conversation.endSession();
            console.log('✅ Conversation ended');
            
            router.push({
                pathname: "/(protected)/summary",
                params: { conversationId }
            } as any);
        } catch (error) {
            console.error('❌ Error ending conversation:', error);
            Alert.alert(
                'Error',
                'Failed to end conversation properly. Returning to summary...'
            );
            
            // Navigate anyway
            router.push({
                pathname: "/(protected)/summary",
                params: { conversationId }
            } as any);
        }
    }

    const canStart = conversation.status === "disconnected" && !isStarting;
    const canEnd = conversation.status === "connected";
    
    const getButtonText = () => {
        if (isStarting) return 'Connecting...';
        if (canStart) return 'Start Conversation';
        if (canEnd) return 'End Conversation';
        return 'Please Wait...';
    };

    return (
        <>
            {/* <Gradient position="top" isSpeaking={
                conversation.status === "connected" || conversation.status === "connecting"
            } /> */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>
                    AI Conversation
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '500', opacity: 0.5, textAlign: 'center' }}>
                    Start a conversation with your AI coach
                </Text>
                
                {conversation.status === "connecting" && (
                    <Text style={{ fontSize: 14, opacity: 0.7 }}>
                        Connecting...
                    </Text>
                )}
                
                <Button 
                    onPress={canStart ? startConversation : endConversation}
                    disabled={!canStart && !canEnd}
                >
                    {getButtonText()}
                </Button>
            </View>
        </>
    );
}