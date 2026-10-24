/**
 * Guest Liability Waiver Signature Modal for Water Sports / Adventure Treks
 * (HMS-Frontend/src/admin/activities/ActivityWaiverModal.tsx)
 *
 * Implements Step 370 (Phase 15.20):
 * - Canvas-based signature pad for guest touch/stylus/mouse signatures.
 * - Multi-category risk assessment (Water Sports, Adventure Treks, Safari, Aerial).
 * - Statutory Sri Lanka Tourism Act & Civil Law liability disclaimer.
 * - Emergency contact, travel insurance policy, and minor guardian consent.
 * - Medical fitness declarations (swimming ability, cardio, pregnancy, asthma).
 * - Apple HIG Liquid Glass styling, SF Pro typography, and trilingual labels.
 */

import type React from "react";
import { type FC, useEffect, useId, useRef, useState } from "react";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AdventureActivityCategory =
 | "WATER_SPORTS"
 | "ADVENTURE_TREKS"
 | "WILDLIFE_SAFARI"
 | "AERIAL_EXTREME";

export type ActivityRiskLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export interface ActivityRiskProfile {
 readonly id: string;
 readonly name: string;
 readonly category: AdventureActivityCategory;
 readonly riskLevel: ActivityRiskLevel;
 readonly minimumAge: number;
 readonly mandatorySafetyGear: readonly string[];
 readonly contraindications: readonly string[];
 readonly description: string;
}

export interface ActivityWaiverGuestDetails {
 readonly guestName: string;
 readonly roomNumber?: string | undefined;
 readonly guestNicOrPassport: string;
 readonly nationality: string;
 readonly emergencyContactName: string;
 readonly emergencyContactPhone: string;
 readonly emergencyContactRelation: string;
 readonly travelInsuranceProvider?: string | undefined;
 readonly travelInsurancePolicyNo?: string | undefined;
}

export interface MedicalFitnessDeclaration {
 readonly canSwimUnaided: boolean;
 readonly hasCardioConditions: boolean;
 readonly hasRespiratoryOrAsthma: boolean;
 readonly isPregnant: boolean;
 readonly hasBackOrSpinalInjuries: boolean;
 readonly notUnderInfluence: boolean;
 readonly takesPrescriptionMeds: boolean;
 readonly medicalNotes?: string | undefined;
}

export interface ActivityWaiverPayload {
 readonly waiverId: string;
 readonly tenantId: string;
 readonly activityId: string;
 readonly activityName: string;
 readonly activityCategory: AdventureActivityCategory;
 readonly riskLevel: ActivityRiskLevel;
 readonly guest: ActivityWaiverGuestDetails;
 readonly medicalFitness: MedicalFitnessDeclaration;
 readonly isMinor: boolean;
 readonly guardianName?: string | undefined;
 readonly guardianRelationship?: string | undefined;
 readonly termsAccepted: boolean;
 readonly signatureDataUrl: string;
 readonly signedAtIso: string;
}

export interface ActivityWaiverModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly tenantId: string;
 readonly activity: ActivityRiskProfile;
 readonly initialGuest?: Partial<ActivityWaiverGuestDetails> | undefined;
 readonly onSaveWaiver: (waiver: ActivityWaiverPayload) => void;
 readonly lang?: "en" | "si" | "ta" | undefined;
}

// ============================================================================
// Standard Activity Profiles
// ============================================================================

export const STANDARD_ACTIVITY_PROFILES: readonly ActivityRiskProfile[] = [
 {
 id: "SCUBA_PIGEON_ISLAND",
 name: "Pigeon Island Marine Sanctuary Scuba Diving",
 category: "WATER_SPORTS",
 riskLevel: "HIGH",
 minimumAge: 12,
 mandatorySafetyGear: [
 "Buoyancy Control Device (BCD)",
 "Regulator",
 "Dive Computer",
 "Fins & Mask",
 ],
 contraindications: [
 "Asthma / Respiratory condition",
 "Ear drum perforation",
 "Heart condition",
 "Pregnancy",
 ],
 description:
 "Deep open-water dive with black-tip reef sharks, sea turtles, and coral reefs off Nilaveli.",
 },
 {
 id: "SURFING_ARUGAM_BAY",
 name: "Arugam Bay Main Point Surfing & Coaching",
 category: "WATER_SPORTS",
 riskLevel: "MODERATE",
 minimumAge: 8,
 mandatorySafetyGear: ["Safety Leash", "Rash Guard", "PFD (for beginners)"],
 contraindications: ["Inability to swim in ocean currents", "Recent shoulder dislocation"],
 description: "Point-break surfing over sand and reef bottom with seasonal swells.",
 },
 {
 id: "WHITE_WATER_RAFTING_KITULGALA",
 name: "Kitulgala Kelani River Grade 3+ White Water Rafting",
 category: "WATER_SPORTS",
 riskLevel: "HIGH",
 minimumAge: 10,
 mandatorySafetyGear: [
 "CE-Certified White Water Helmet",
 "Type V PFD Life Jacket",
 "River Guide",
 ],
 contraindications: ["Heart condition", "Epilepsy", "Pregnancy", "Severe mobility impairment"],
 description:
 "Rapid descents including Virgin's Breast, Killer Fall, and Butter Crunch on Kelani River.",
 },
 {
 id: "KNUCKLES_WILDERNESS_HIKE",
 name: "Knuckles Conservation Forest Cloud Forest Ridge Trek",
 category: "ADVENTURE_TREKS",
 riskLevel: "MODERATE",
 minimumAge: 12,
 mandatorySafetyGear: [
 "Leech Socks",
 "Trekking Pole",
 "First Aid Kit",
 "Certified Naturalist Guide",
 ],
 contraindications: ["Severe asthma", "Cardiac history", "Knee joint instability"],
 description:
 "High-altitude wilderness hike across misty peaks, endemic biodiversity, and steep drops.",
 },
 {
 id: "PARAMOTOR_BENTOTA",
 name: "Bentota Golden Coastline Powered Paramotor Flight",
 category: "AERIAL_EXTREME",
 riskLevel: "EXTREME",
 minimumAge: 14,
 mandatorySafetyGear: [
 "Aviation Helmet",
 "In-Flight Harness",
 "Emergency Parachute",
 "Tandem Pilot",
 ],
 contraindications: ["Vertigo", "Cardiovascular condition", "Pregnancy", "Panic disorder"],
 description: "Tandem motorized paragliding at 1,000 feet along the Indian Ocean coastline.",
 },
];

// ============================================================================
// Translations
// ============================================================================

export interface WaiverModalTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly riskLevelLabel: string;
 readonly guestInfo: string;
 readonly guestName: string;
 readonly roomNumber: string;
 readonly nicOrPassport: string;
 readonly nationality: string;
 readonly emergencyContact: string;
 readonly contactName: string;
 readonly contactPhone: string;
 readonly relationship: string;
 readonly insuranceProvider: string;
 readonly policyNo: string;
 readonly medicalTitle: string;
 readonly canSwim: string;
 readonly cardio: string;
 readonly asthma: string;
 readonly pregnant: string;
 readonly sober: string;
 readonly minorTitle: string;
 readonly isMinorCheckbox: string;
 readonly guardianName: string;
 readonly guardianRelation: string;
 readonly legalDisclaimer: string;
 readonly acceptTerms: string;
 readonly signatureTitle: string;
 readonly clearSignature: string;
 readonly cancelBtn: string;
 readonly submitBtn: string;
}

export const WAIVER_TRANSLATIONS: Record<"en" | "si" | "ta", WaiverModalTranslations> = {
 en: {
 title: "Activity Liability Waiver & Risk Release",
 subtitle:
 "Democratic Socialist Republic of Sri Lanka — Participant Agreement & Medical Consent",
 riskLevelLabel: "Risk Level",
 guestInfo: "Participant Identification",
 guestName: "Full Name (as in Passport / NIC)",
 roomNumber: "Room / Villa Number",
 nicOrPassport: "NIC / Passport Number",
 nationality: "Nationality",
 emergencyContact: "Emergency Contact & Travel Insurance",
 contactName: "Emergency Contact Name",
 contactPhone: "Contact Phone (with Country Code)",
 relationship: "Relationship",
 insuranceProvider: "Travel Insurance Company (Optional)",
 policyNo: "Policy Number (Optional)",
 medicalTitle: "Medical Fitness & Safety Declarations",
 canSwim: "I can swim at least 50 meters unaided in open water (Water Sports)",
 cardio: "I confirm I have no known heart disease or cardiovascular conditions",
 asthma: "I confirm I do not suffer from severe asthma, epilepsy, or blackouts",
 pregnant: "I confirm I am not pregnant (applicable to high-impact activities)",
 sober: "I am not under the influence of alcohol, medications, or narcotics",
 minorTitle: "Minor Participant (< 18 Years)",
 isMinorCheckbox: "Participant is under 18 years of age (Guardian Consent Required)",
 guardianName: "Parent / Legal Guardian Full Name",
 guardianRelation: "Guardian Relationship (e.g., Mother, Father)",
 legalDisclaimer:
 "I hereby acknowledge that participation in adventure activities, open ocean sports, wildlife safaris, and wilderness treks involves inherent risks of injury or loss. I agree to release the hotel, organizers, and certified guides from liability for unforeseen accidents to the fullest extent permitted under Sri Lankan law.",
 acceptTerms: "I have read, understood, and accept the liability waiver terms",
 signatureTitle: "Digital Signature (Touch / Stylus / Mouse)",
 clearSignature: "Clear Signature",
 cancelBtn: "Cancel",
 submitBtn: "Sign & Confirm Waiver",
 },
 si: {
 title: "ක්රියාකාරකම් වගකීම් නිදහස් කිරීමේ ගිවිසුම",
 subtitle: "ශ්රී ලංකා ප්රජාතාන්ත්රික සමාජවාදී ජනරජය — සහභාගිවන්නන්ගේ වෛද්ය සහ ආරක්ෂක එකඟතාව",
 riskLevelLabel: "අවදානම් මට්ටම",
 guestInfo: "සහභාගිවන්නාගේ විස්තර",
 guestName: "සම්පූර්ණ නම (විදේශ ගමන් බලපත්රය / හැඳුනුම්පත අනුව)",
 roomNumber: "කාමර අංකය",
 nicOrPassport: "හැඳුනුම්පත් / පාස්පෝට් අංකය",
 nationality: "ජාතිකත්වය",
 emergencyContact: "හදිසි සම්බන්ධතා සහ රක්ෂණ විස්තර",
 contactName: "හදිසි ඇමතුම් නම",
 contactPhone: "දුරකථන අංකය",
 relationship: "ඥාතිත්වය",
 insuranceProvider: "සංචාරක රක්ෂණ සමාගම",
 policyNo: "පොලිසි අංකය",
 medicalTitle: "වෛද්ය යෝග්යතාව සහ සෞඛ්ය ප්රකාශනය",
 canSwim: "විවෘත ජලයේ මීටර් 50ක් ආධාර රහිතව පිහිනීමට හැකිය",
 cardio: "හෘද රෝග හෝ අධික රුධිර පීඩනය නොමැත",
 asthma: "ඇදුම, අපස්මාරය හෝ කරකැවිල්ල නොමැත",
 pregnant: "ගර්භනී තත්ත්වයේ නොමැත",
 sober: "මත්පැන් හෝ මත්ද්රව්ය භාවිතා කර නොමැත",
 minorTitle: "බාලවයස්කාර සහභාගිවන්නා (වයස 18ට අඩු)",
 isMinorCheckbox: "සහභාගිවන්නා වයස අවුරුදු 18ට අඩුය (භාරකරුගේ අනුමැතිය අවශ්යයි)",
 guardianName: "දෙමාපිය / නීත්යානුකූල භාරකරුගේ නම",
 guardianRelation: "භාරකාර සම්බන්ධතාවය",
 legalDisclaimer:
 "ජල ක්රීඩා, වනජීවී සෆාරි සහ කඳු නැගීමේ ක්රියාකාරකම්වල පවතින අවදානම් පිළිබඳව මම සම්පූර්ණයෙන්ම දැනුවත් වන අතර, ශ්රී ලංකා නීතිය යටතේ හෝටලය හෝ මඟපෙන්වන්නන් වගකීමෙන් නිදහස් කිරීමට එකඟ වෙමි.",
 acceptTerms: "මම නියමයන් සහ කොන්දේසි කියවා පිළිගනිමි",
 signatureTitle: "ඩිජිටල් අත්සන (ස්පර්ශ / මවුස්)",
 clearSignature: "අත්සන මකන්න",
 cancelBtn: "අවලංගු කරන්න",
 submitBtn: "අත්සන් කර තහවුරු කරන්න",
 },
 ta: {
 title: "பொறுப்புத் துறப்பு மற்றும் இடர் உடன்படிக்கை",
 subtitle: "இலங்கை ஜனநாயக சோசலிசக் குடியரசு — பங்கேற்பாளர் உடன்படிக்கை",
 riskLevelLabel: "இடர் நிலை",
 guestInfo: "பங்கேற்பாளர் விபரங்கள்",
 guestName: "முழுப் பெயர் (கடவுச்சீட்டு / அடையாள அட்டை படி)",
 roomNumber: "அறை எண்",
 nicOrPassport: "அடையாள அட்டை / கடவுச்சீட்டு எண்",
 nationality: "தேசியம்",
 emergencyContact: "அவசர தொடர்பு மற்றும் காப்பீடு",
 contactName: "அவசர தொடர்பு நபர்",
 contactPhone: "தொலைபேசி எண்",
 relationship: "உறவுமுறை",
 insuranceProvider: "பயணக் காப்பீட்டு நிறுவனம்",
 policyNo: "பாலிசி எண்",
 medicalTitle: "மருத்துவ தகுதி மற்றும் பாதுகாப்பு உறுதிமொழி",
 canSwim: "திறந்த நீரில் 50 மீற்றர் நீந்த முடியும்",
 cardio: "இதய நோய்கள் எதுவும் இல்லை என உறுதிப்படுத்துகிறேன்",
 asthma: "ஆஸ்துமா அல்லது வலிப்பு நோய் இல்லை",
 pregnant: "கர்ப்பமாக இல்லை",
 sober: "மது அல்லது போதைப்பொருள் உட்கொள்ளவில்லை",
 minorTitle: "18 வயதுக்குட்பட்ட பங்கேற்பாளர்",
 isMinorCheckbox: "பங்கேற்பாளர் 18 வயதுக்கு குறைவானவர் (பெற்றோர் அனுமதி தேவை)",
 guardianName: "பெற்றோர் / பாதுகாவலர் பெயர்",
 guardianRelation: "உறவுமுறை",
 legalDisclaimer:
 "சாகச விளையாட்டுக்களின் அபாயங்களை நான் முழுமையாக உணர்ந்துள்ளேன். எதிர்பாராத சம்பவங்களுக்கு ஹோட்டல் அல்லது வழிகாட்டிகள் மீது சட்டப்பூர்வ பொறுப்பு கோர மாட்டேன்.",
 acceptTerms: "விதிமுறைகளை படித்து ஒப்புக்கொள்கிறேன்",
 signatureTitle: "டிஜிட்டல் கையொப்பம்",
 clearSignature: "அழிக்கவும்",
 cancelBtn: "ரத்து செய்",
 submitBtn: "கையொப்பமிட்டு உறுதிப்படுத்துக",
 },
};

// ============================================================================
// Helpers & Subcomponents
// ============================================================================

export function getRiskLevelBadgeClass(level: ActivityRiskLevel): string {
 switch (level) {
 case "LOW":
 return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
 case "MODERATE":
 return "bg-sky-500/15 text-sky-700 border-sky-500/30";
 case "HIGH":
 return "bg-amber-500/15 text-amber-700 border-amber-500/30";
 case "EXTREME":
 return "bg-rose-500/15 text-rose-700 border-rose-500/30";
 default:
 return "bg-slate-500/15 text-slate-700 border-slate-500/30";
 }
}

export interface WaiverValidationErrors {
 guestName?: string;
 guestNicOrPassport?: string;
 emergencyContactName?: string;
 emergencyContactPhone?: string;
 guardianName?: string;
 termsAccepted?: string;
 signature?: string;
}

export function validateWaiverForm(
 guest: ActivityWaiverGuestDetails,
 isMinor: boolean,
 guardianName: string,
 termsAccepted: boolean,
 hasStrokes: boolean,
): { isValid: boolean; errors: WaiverValidationErrors } {
 const errors: WaiverValidationErrors = {};

 if (!guest.guestName.trim()) {
 errors.guestName = "Participant name is required.";
 }
 if (!guest.guestNicOrPassport.trim()) {
 errors.guestNicOrPassport = "NIC or Passport number is required.";
 }
 if (!guest.emergencyContactName.trim()) {
 errors.emergencyContactName = "Emergency contact name is required.";
 }
 if (!guest.emergencyContactPhone.trim()) {
 errors.emergencyContactPhone = "Emergency contact phone number is required.";
 }
 if (isMinor && !guardianName.trim()) {
 errors.guardianName = "Parent/Guardian name is required for minors.";
 }
 if (!termsAccepted) {
 errors.termsAccepted = "You must read and accept the liability waiver terms.";
 }
 if (!hasStrokes) {
 errors.signature = "Digital signature is required.";
 }

 return {
 isValid: Object.keys(errors).length === 0,
 errors,
 };
}

// ============================================================================
// Canvas Signature Pad Subcomponent
// ============================================================================

export interface SignatureCanvasProps {
 readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
 readonly hasStrokes: boolean;
 readonly onStroke: () => void;
 readonly onClear: () => void;
 readonly clearLabel: string;
 readonly error?: string | undefined;
}

export function SignatureCanvas({
 canvasRef,
 hasStrokes,
 onStroke,
 onClear,
 clearLabel,
 error,
}: SignatureCanvasProps) {
 const [drawing, setDrawing] = useState(false);

 const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 canvas.setPointerCapture?.(e.pointerId);
 const rect = canvas.getBoundingClientRect();
 const ctx = canvas.getContext?.("2d");
 if (!ctx) return;
 ctx.lineWidth = 2.5;
 ctx.lineCap = "round";
 ctx.lineJoin = "round";
 ctx.strokeStyle = "#0f172a";
 ctx.beginPath();
 ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
 setDrawing(true);
 onStroke();
 };

 const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
 if (!drawing) return;
 const canvas = canvasRef.current;
 if (!canvas) return;
 const rect = canvas.getBoundingClientRect();
 const ctx = canvas.getContext?.("2d");
 if (!ctx) return;
 ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
 ctx.stroke();
 };

 const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
 if (!drawing) return;
 setDrawing(false);
 const canvas = canvasRef.current;
 if (canvas?.hasPointerCapture?.(e.pointerId)) {
 canvas.releasePointerCapture?.(e.pointerId);
 }
 };

 return (
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-800 ">
 Digital Signature *
 </span>
 <button
 type="button"
 onClick={onClear}
 disabled={!hasStrokes}
 className="px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
 >
 {clearLabel}
 </button>
 </div>

 <div
 className={`relative w-full h-40 rounded-2xl border-2 border-dashed ${
 error ? "border-rose-400" : "border-slate-300 "
 } bg-white overflow-hidden shadow-inner touch-none`}
 >
 <canvas
 ref={canvasRef}
 width={600}
 height={160}
 onPointerDown={startDraw}
 onPointerMove={draw}
 onPointerUp={stopDraw}
 onPointerCancel={stopDraw}
 onPointerLeave={stopDraw}
 className="w-full h-full cursor-crosshair touch-none"
 aria-label="Guest Signature Canvas"
 />
 <div className="pointer-events-none absolute bottom-4 left-6 right-6 flex items-center gap-2 border-b border-slate-300 text-[11px] text-slate-400 select-none">
 <span className="font-bold">x</span>
 <span>Sign above the line</span>
 </div>
 </div>
 {error && <p className="text-xs text-rose-600 ">{error}</p>}
 </div>
 );
}

// ============================================================================
// Subcomponents for Modular UI
// ============================================================================

export interface ParticipantInputsProps {
 readonly guestName: string;
 readonly setGuestName: (val: string) => void;
 readonly roomNumber: string;
 readonly setRoomNumber: (val: string) => void;
 readonly nicOrPassport: string;
 readonly setNicOrPassport: (val: string) => void;
 readonly nationality: string;
 readonly setNationality: (val: string) => void;
 readonly errors: WaiverValidationErrors;
 readonly t: WaiverModalTranslations;
}

export function ParticipantInputs({
 guestName,
 setGuestName,
 roomNumber,
 setRoomNumber,
 nicOrPassport,
 setNicOrPassport,
 nationality,
 setNationality,
 errors,
 t,
}: ParticipantInputsProps) {
 return (
 <div className="space-y-3">
 <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400">
 {t.guestInfo}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.guestName} *</span>
 <input
 type="text"
 value={guestName}
 onChange={(e) => setGuestName(e.target.value)}
 placeholder="e.g. Johnathan Smith"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 {errors.guestName && (
 <p className="text-[11px] text-rose-500 mt-0.5">{errors.guestName}</p>
 )}
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.roomNumber}</span>
 <input
 type="text"
 value={roomNumber}
 onChange={(e) => setRoomNumber(e.target.value)}
 placeholder="e.g. Villa 204 or Walk-in"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.nicOrPassport} *</span>
 <input
 type="text"
 value={nicOrPassport}
 onChange={(e) => setNicOrPassport(e.target.value)}
 placeholder="e.g. 199012345678 or N1234567"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 {errors.guestNicOrPassport && (
 <p className="text-[11px] text-rose-500 mt-0.5">{errors.guestNicOrPassport}</p>
 )}
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.nationality}</span>
 <input
 type="text"
 value={nationality}
 onChange={(e) => setNationality(e.target.value)}
 placeholder="e.g. British, German, Sri Lankan"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 </div>
 </div>
 </div>
 );
}

export interface EmergencyContactInputsProps {
 readonly emergencyName: string;
 readonly setEmergencyName: (val: string) => void;
 readonly emergencyPhone: string;
 readonly setEmergencyPhone: (val: string) => void;
 readonly emergencyRelation: string;
 readonly setEmergencyRelation: (val: string) => void;
 readonly errors: WaiverValidationErrors;
 readonly t: WaiverModalTranslations;
}

export function EmergencyContactInputs({
 emergencyName,
 setEmergencyName,
 emergencyPhone,
 setEmergencyPhone,
 emergencyRelation,
 setEmergencyRelation,
 errors,
 t,
}: EmergencyContactInputsProps) {
 return (
 <div className="space-y-3">
 <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400">
 {t.emergencyContact}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.contactName} *</span>
 <input
 type="text"
 value={emergencyName}
 onChange={(e) => setEmergencyName(e.target.value)}
 placeholder="Contact Name"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 {errors.emergencyContactName && (
 <p className="text-[11px] text-rose-500 mt-0.5">{errors.emergencyContactName}</p>
 )}
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.contactPhone} *</span>
 <input
 type="tel"
 value={emergencyPhone}
 onChange={(e) => setEmergencyPhone(e.target.value)}
 placeholder="+94 77 123 4567"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 {errors.emergencyContactPhone && (
 <p className="text-[11px] text-rose-500 mt-0.5">{errors.emergencyContactPhone}</p>
 )}
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.relationship}</span>
 <input
 type="text"
 value={emergencyRelation}
 onChange={(e) => setEmergencyRelation(e.target.value)}
 placeholder="e.g. Spouse / Parent"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
 />
 </label>
 </div>
 </div>
 </div>
 );
}

export interface MedicalChecklistProps {
 readonly isWaterSports: boolean;
 readonly canSwim: boolean;
 readonly setCanSwim: (val: boolean) => void;
 readonly noCardio: boolean;
 readonly setNoCardio: (val: boolean) => void;
 readonly noAsthma: boolean;
 readonly setNoAsthma: (val: boolean) => void;
 readonly notPregnant: boolean;
 readonly setNotPregnant: (val: boolean) => void;
 readonly sober: boolean;
 readonly setSober: (val: boolean) => void;
 readonly t: WaiverModalTranslations;
}

export function MedicalChecklist({
 isWaterSports,
 canSwim,
 setCanSwim,
 noCardio,
 setNoCardio,
 noAsthma,
 setNoAsthma,
 notPregnant,
 setNotPregnant,
 sober,
 setSober,
 t,
}: MedicalChecklistProps) {
 return (
 <div className="space-y-2.5">
 <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400">
 {t.medicalTitle}
 </h3>
 <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 ">
 {isWaterSports && (
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={canSwim}
 onChange={(e) => setCanSwim(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.canSwim}</span>
 </label>
 )}
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={noCardio}
 onChange={(e) => setNoCardio(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.cardio}</span>
 </label>
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={noAsthma}
 onChange={(e) => setNoAsthma(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.asthma}</span>
 </label>
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={notPregnant}
 onChange={(e) => setNotPregnant(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.pregnant}</span>
 </label>
 <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
 <input
 type="checkbox"
 checked={sober}
 onChange={(e) => setSober(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.sober}</span>
 </label>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component: ActivityWaiverModal
// ============================================================================

export const ActivityWaiverModal: FC<ActivityWaiverModalProps> = ({
 isOpen,
 onClose,
 tenantId,
 activity,
 initialGuest,
 onSaveWaiver,
 lang = "en",
}) => {
 const dialogRef = useRef<HTMLDialogElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const termsCheckboxId = useId();
 const minorCheckboxId = useId();
 const t = WAIVER_TRANSLATIONS[lang] || WAIVER_TRANSLATIONS.en;

 const [guestName, setGuestName] = useState(initialGuest?.guestName || "");
 const [roomNumber, setRoomNumber] = useState(initialGuest?.roomNumber || "");
 const [nicOrPassport, setNicOrPassport] = useState(initialGuest?.guestNicOrPassport || "");
 const [nationality, setNationality] = useState(initialGuest?.nationality || "Sri Lankan");
 const [emergencyName, setEmergencyName] = useState(initialGuest?.emergencyContactName || "");
 const [emergencyPhone, setEmergencyPhone] = useState(initialGuest?.emergencyContactPhone || "");
 const [emergencyRelation, setEmergencyRelation] = useState(
 initialGuest?.emergencyContactRelation || "Spouse",
 );

 const [isMinor, setIsMinor] = useState(false);
 const [guardianName, setGuardianName] = useState("");
 const [guardianRelation, setGuardianRelation] = useState("Parent");

 const [canSwim, setCanSwim] = useState(activity?.category === "WATER_SPORTS");
 const [sober, setSober] = useState(true);
 const [noCardio, setNoCardio] = useState(true);
 const [noAsthma, setNoAsthma] = useState(true);
 const [notPregnant, setNotPregnant] = useState(true);

 const [termsAccepted, setTermsAccepted] = useState(false);
 const [hasStrokes, setHasStrokes] = useState(false);
 const [errors, setErrors] = useState<WaiverValidationErrors>({});

 useEffect(() => {
 const dialog = dialogRef.current;
 if (!dialog) return;
 if (isOpen) {
 if (!dialog.open) dialog.showModal();
 } else {
 if (dialog.open) dialog.close();
 }
 }, [isOpen]);

 const handleClearSignature = () => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 setHasStrokes(false);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 const guest: ActivityWaiverGuestDetails = {
 guestName,
 roomNumber: roomNumber.trim() || undefined,
 guestNicOrPassport: nicOrPassport,
 nationality,
 emergencyContactName: emergencyName,
 emergencyContactPhone: emergencyPhone,
 emergencyContactRelation: emergencyRelation,
 };

 const validation = validateWaiverForm(guest, isMinor, guardianName, termsAccepted, hasStrokes);
 if (!validation.isValid) {
 setErrors(validation.errors);
 return;
 }

 setErrors({});
 const canvas = canvasRef.current;
 const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : "";
 const now = new Date().toISOString();
 const dateCompact = now.slice(0, 10).replace(/-/g, "");
 const waiverId = `WVR-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;

 onSaveWaiver({
 waiverId,
 tenantId,
 activityId: activity.id,
 activityName: activity.name,
 activityCategory: activity.category,
 riskLevel: activity.riskLevel,
 guest,
 medicalFitness: {
 canSwimUnaided: canSwim,
 hasCardioConditions: !noCardio,
 hasRespiratoryOrAsthma: !noAsthma,
 isPregnant: !notPregnant,
 hasBackOrSpinalInjuries: false,
 notUnderInfluence: sober,
 takesPrescriptionMeds: false,
 },
 isMinor,
 guardianName: isMinor ? guardianName : undefined,
 guardianRelationship: isMinor ? guardianRelation : undefined,
 termsAccepted,
 signatureDataUrl,
 signedAtIso: now,
 });
 onClose();
 };

 if (!isOpen) return null;

 return (
 <dialog
 ref={dialogRef}
 className="fixed inset-0 m-auto max-h-[92vh] w-[95vw] max-w-2xl rounded-2xl p-0 border border-[#E2E8F0] shadow-2xl backdrop:backdrop-blur-xl backdrop:bg-black/60 bg-white/95 overflow-hidden transition-all text-slate-900 "
 >
 <form onSubmit={handleSubmit} className="flex flex-col max-h-[92vh]">
 {/* Modal Header */}
 <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-200 bg-slate-50/70 backdrop-blur-md">
 <div className="space-y-1 pr-4">
 <div className="flex items-center gap-2.5">
 <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
 <span
 className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${getRiskLevelBadgeClass(
 activity.riskLevel,
 )}`}
 >
 {activity.riskLevel} {t.riskLevelLabel}
 </span>
 </div>
 <p className="text-xs text-slate-500 ">{activity.name}</p>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
 aria-label="Close dialog"
 >
 x
 </button>
 </div>

 {/* Modal Scrollable Body */}
 <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
 {/* Activity Notice Card */}
 <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-100/60 space-y-2">
 <p className="text-xs text-slate-600 leading-relaxed">
 {activity.description}
 </p>
 <div className="text-[11px] flex flex-wrap gap-2 text-slate-500">
 <span className="font-semibold text-slate-700 ">
 Mandatory Safety Gear:
 </span>
 {activity.mandatorySafetyGear.join(", ")}
 </div>
 </div>

 <ParticipantInputs
 guestName={guestName}
 setGuestName={setGuestName}
 roomNumber={roomNumber}
 setRoomNumber={setRoomNumber}
 nicOrPassport={nicOrPassport}
 setNicOrPassport={setNicOrPassport}
 nationality={nationality}
 setNationality={setNationality}
 errors={errors}
 t={t}
 />

 <EmergencyContactInputs
 emergencyName={emergencyName}
 setEmergencyName={setEmergencyName}
 emergencyPhone={emergencyPhone}
 setEmergencyPhone={setEmergencyPhone}
 emergencyRelation={emergencyRelation}
 setEmergencyRelation={setEmergencyRelation}
 errors={errors}
 t={t}
 />

 <MedicalChecklist
 isWaterSports={activity.category === "WATER_SPORTS"}
 canSwim={canSwim}
 setCanSwim={setCanSwim}
 noCardio={noCardio}
 setNoCardio={setNoCardio}
 noAsthma={noAsthma}
 setNoAsthma={setNoAsthma}
 notPregnant={notPregnant}
 setNotPregnant={setNotPregnant}
 sober={sober}
 setSober={setSober}
 t={t}
 />

 {/* Minor Guardian Consent Toggle */}
 <div className="space-y-3">
 <label
 htmlFor={minorCheckboxId}
 className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
 >
 <input
 id={minorCheckboxId}
 type="checkbox"
 checked={isMinor}
 onChange={(e) => setIsMinor(e.target.checked)}
 className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
 />
 <span>{t.isMinorCheckbox}</span>
 </label>
 {isMinor && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-2xl border border-sky-200 bg-sky-50/50 ">
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.guardianName} *</span>
 <input
 type="text"
 value={guardianName}
 onChange={(e) => setGuardianName(e.target.value)}
 placeholder="Guardian Full Name"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white "
 />
 </label>
 {errors.guardianName && (
 <p className="text-[11px] text-rose-500 mt-0.5">{errors.guardianName}</p>
 )}
 </div>
 <div>
 <label className="block space-y-1 text-xs font-medium text-slate-600 ">
 <span>{t.guardianRelation}</span>
 <input
 type="text"
 value={guardianRelation}
 onChange={(e) => setGuardianRelation(e.target.value)}
 placeholder="e.g. Mother / Father"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white "
 />
 </label>
 </div>
 </div>
 )}
 </div>

 {/* Legal Disclaimer Box */}
 <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/60 space-y-2">
 <p className="text-xs text-amber-950 leading-relaxed">
 {t.legalDisclaimer}
 </p>
 <label
 htmlFor={termsCheckboxId}
 className="flex items-center gap-2.5 pt-1 text-xs font-bold text-amber-900 cursor-pointer select-none"
 >
 <input
 id={termsCheckboxId}
 type="checkbox"
 checked={termsAccepted}
 onChange={(e) => setTermsAccepted(e.target.checked)}
 className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
 />
 <span>{t.acceptTerms} *</span>
 </label>
 {errors.termsAccepted && (
 <p className="text-[11px] text-rose-600 font-semibold">
 {errors.termsAccepted}
 </p>
 )}
 </div>

 {/* Signature Canvas Pad */}
 <SignatureCanvas
 canvasRef={canvasRef}
 hasStrokes={hasStrokes}
 onStroke={() => setHasStrokes(true)}
 onClear={handleClearSignature}
 clearLabel={t.clearSignature}
 error={errors.signature}
 />
 </div>

 {/* Modal Footer Actions */}
 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/70 backdrop-blur-md">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors min-h-[44px]"
 >
 {t.cancelBtn}
 </button>
 <button
 type="submit"
 className="px-5 py-2.5 text-xs font-semibold rounded-xl text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 shadow-md shadow-sky-600/20 transition-all min-h-[44px]"
 >
 {t.submitBtn}
 </button>
 </div>
 </form>
 </dialog>
 );
};
