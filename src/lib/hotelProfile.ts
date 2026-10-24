import { BusinessType } from "../generated/graphql.js";

export interface PropertyProfileData {
 readonly shopName: string;
 readonly businessType: BusinessType;
 readonly contactPhone: string;
 readonly email: string;
 readonly address: string;
 readonly city: string;
 readonly bannerUrl: string;
 readonly logoUrl: string;
 readonly description: string;
}

const HOTEL_PROFILE_STORAGE_KEY = "hms_hotel_profile";
const HOTEL_PROFILE_EVENT = "hms_hotel_profile_updated";

export const DEFAULT_PROPERTY_PROFILE: PropertyProfileData = {
 shopName: "Galle Fort Lighthouse Villa",
 businessType: BusinessType.BoutiqueVilla,
 contactPhone: "+94771234567",
 email: "stay@gallefortvilla.lk",
 address: "42 Rampart Street, Galle Fort",
 city: "Galle",
 bannerUrl: "",
 logoUrl: "",
 description:
 "Luxury 8-bedroom Dutch colonial heritage villa inside UNESCO World Heritage Galle Fort.",
};

export function getStoredHotelProfile(): PropertyProfileData {
 if (typeof window === "undefined") {
 return DEFAULT_PROPERTY_PROFILE;
 }

 try {
 const raw = localStorage.getItem(HOTEL_PROFILE_STORAGE_KEY);
 if (!raw) return DEFAULT_PROPERTY_PROFILE;
 const parsed = JSON.parse(raw);
 return {
 ...DEFAULT_PROPERTY_PROFILE,
 ...parsed,
 };
 } catch {
 return DEFAULT_PROPERTY_PROFILE;
 }
}

export function saveStoredHotelProfile(data: PropertyProfileData): void {
 if (typeof window === "undefined") return;

 try {
 localStorage.setItem(HOTEL_PROFILE_STORAGE_KEY, JSON.stringify(data));
 window.dispatchEvent(new CustomEvent(HOTEL_PROFILE_EVENT, { detail: data }));
 } catch {
 // storage ceiling fallback
 }
}

export function subscribeToHotelProfile(
 listener: (profile: PropertyProfileData) => void,
): () => void {
 if (typeof window === "undefined") {
 return () => {
 // noop in ssr
 };
 }

 const handleUpdate = () => {
 listener(getStoredHotelProfile());
 };

 window.addEventListener(HOTEL_PROFILE_EVENT, handleUpdate);
 window.addEventListener("storage", (e) => {
 if (e.key === HOTEL_PROFILE_STORAGE_KEY) {
 handleUpdate();
 }
 });

 return () => {
 window.removeEventListener(HOTEL_PROFILE_EVENT, handleUpdate);
 };
}
