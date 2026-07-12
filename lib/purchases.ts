import Constants from 'expo-constants';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const RC_ENTITLEMENT = 'sermonmate Pro';
const API_KEY = Constants.expoConfig?.extra?.revenueCatAndroidKey as string | undefined;

let configured = false;

export function configurePurchases(): void {
  if (configured) return;
  if (!API_KEY) {
    console.warn('RevenueCat key missing from app config extra; skipping configure.');
    return;
  }
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

export async function identifyPurchaser(uid: string): Promise<void> {
  configurePurchases();
  if (!configured) return;
  await Purchases.logIn(uid);
}

export async function logoutPurchaser(): Promise<void> {
  if (!configured) return;
  await Purchases.logOut();
}

export function isProFromInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[RC_ENTITLEMENT] !== 'undefined';
}

export async function getIsPro(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.getCustomerInfo();
  return isProFromInfo(info);
}

export async function presentPaywall(): Promise<boolean> {
  configurePurchases();
  if (!configured) return false;
  const result = await RevenueCatUI.presentPaywall();
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentCustomerCenter(): Promise<void> {
  configurePurchases();
  if (!configured) return;
  await RevenueCatUI.presentCustomerCenter();
}

export function addProListener(cb: (isPro: boolean) => void): () => void {
  const listener = (info: CustomerInfo) => cb(isProFromInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

// Ask the backend to mirror the live RevenueCat entitlement into Firestore.
export async function syncEntitlement(): Promise<boolean> {
  const call = httpsCallable<undefined, { pro: boolean }>(functions, 'syncEntitlement');
  const res = await call();
  return res.data.pro;
}
