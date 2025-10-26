import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '@/lib/stores/auth';
import { useCreditsStore } from '@/lib/stores/credits';

export default function CreditsScreen() {
  const { user, updateUser } = useAuthStore();
  const { packages, isLoading, fetchPackages, initializePayment } = useCreditsStore();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const handlePurchase = async (packageId: number) => {
    setSelectedPackage(packageId);
    
    try {
      const result = await initializePayment(packageId);
      
      if (result.success) {
        // In a real app, you would integrate with Paystack here
        Alert.alert(
          'Payment Initialized',
          'Payment has been initialized. In a real app, this would open the Paystack payment interface.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Simulate successful payment for demo
                const packageData = packages.find(p => p.id === packageId);
                if (packageData && user) {
                  const updatedUser = {
                    ...user,
                    credits: user.credits + packageData.sessions_count,
                  };
                  updateUser(updatedUser);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to initialize payment');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSelectedPackage(null);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Credits</Text>
        <Text style={styles.subtitle}>Manage your session credits</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{user?.credits || 0} credits</Text>
        <Text style={styles.balanceDescription}>
          {user?.free_trial_used ? 'Free trial used' : 'Free trial available'}
        </Text>
      </View>

      <View style={styles.packagesSection}>
        <Text style={styles.sectionTitle}>Credit Packages</Text>
        <Text style={styles.sectionDescription}>
          Choose a package to purchase more credits
        </Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Loading packages...</Text>
        ) : (
          <View style={styles.packagesList}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage === pkg.id && styles.packageCardSelected,
                ]}
                onPress={() => handlePurchase(pkg.id)}
                disabled={selectedPackage !== null}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>{formatPrice(pkg.price_usd)}</Text>
                </View>
                <Text style={styles.packageDescription}>
                  {pkg.sessions_count} AI conversation sessions
                </Text>
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    selectedPackage === pkg.id && styles.purchaseButtonLoading,
                  ]}
                  onPress={() => handlePurchase(pkg.id)}
                  disabled={selectedPackage !== null}
                >
                  <Text style={styles.purchaseButtonText}>
                    {selectedPackage === pkg.id ? 'Processing...' : 'Purchase'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How Credits Work</Text>
        <Text style={styles.infoText}>
          • Each AI conversation session costs 1 credit{'\n'}
          • Sermon generation is free{'\n'}
          • New users get 1 free session{'\n'}
          • Credits never expire
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  balanceCard: {
    margin: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  balanceDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  packagesSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    padding: 24,
  },
  packagesList: {
    gap: 16,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  packageCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  purchaseButtonLoading: {
    backgroundColor: '#9ca3af',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    margin: 24,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
