import SignOutButton from "@/components/clerk/SignOutButton";
import { useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Profile() {
  const { user } = useUser();

  return (
    <View style={styles.container}>
      {user?.imageUrl ? (
        <Image
          source={{ uri: user.imageUrl }}
          style={styles.avatar}
        />
      ) : null}
      <Text style={styles.name}>{user?.fullName ?? user?.username ?? "User"}</Text>
      <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress ?? ""}</Text>

      <View style={{ height: 24 }} />
      <SignOutButton redirectUrl="/(public)" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
  },
  email: {
    fontSize: 14,
    opacity: 0.7,
  },
});


