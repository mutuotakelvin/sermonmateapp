import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";

export default function ParallaxScrollView({ children }: PropsWithChildren) {
    const scrollRef = useAnimatedRef<Animated.ScrollView>()

    return (
        <View style={styles.container}>
            <Animated.ScrollView 
                ref={scrollRef}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </Animated.ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})