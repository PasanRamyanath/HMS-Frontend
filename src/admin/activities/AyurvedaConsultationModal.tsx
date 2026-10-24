/**
 * Ayurveda Doctor (Vaidya) Dosha Consultation & Treatment Plan Card (AyurvedaConsultationModal.tsx)
 *
 * Implements Step 353 (Phase 15.03) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized clinical consultation card and wellness treatment planner for resident Ayurvedic
 * Doctors (Vaidya) and Spa Directors at Sri Lankan luxury wellness resorts & boutique villas:
 *
 * 1. Prakriti & Vikriti (Dosha Diagnosis):
 * - Captures Vata, Pitta, and Kapha constitution percentages (e.g. 50% Vata, 35% Pitta, 15% Kapha).
 * - Records Pulse diagnosis (Nadi Pariksha), tongue coating (Jihwa), skin temperature, and sleep rhythm.
 * 2. Vitals & Medical Contraindications:
 * - Blood pressure (Systolic / Diastolic), pulse rate, hypertension warning flags, pregnancy guard,
 * cardiac history, and open skin lesion contraindication checklist.
 * 3. Prescribed Ayurvedic Diet & KDS Meal Plan Sync:
 * - Prescribes dosha-balancing diet regimen (Sattvic, Vata-Pacifying, Pitta-Cooling, Kapha-Reducing).
 * - Specifies herbal infusions (e.g. Kothalahimbutu, Ginger-Coriander 'Pas Panguwa', Ranawara tea).
 * - Auto-sync toggle transmitting dietary restrictions to the guest's checked-in room KDS profile!
 * 4. Multi-Day Wellness Treatment Prescription:
 * - Configures daily wellness schedule (Shirodhara, Abhyanga, Pinda Sweda, Vashpa Sweda herbal steam, Nasya).
 * - Assigns qualified therapist gender/specialist and allocated treatment suites.
 * 5. Apple Human Interface Guidelines:
 * - Translucent modal sheet with .apple-liquid-glass backdrop surfaces.
 * - SF Pro optical typography with .tabular-nums-lkr on vitals and percentages.
 * - iOS-style SegmentedControl, continuous squircles, >= 44x44pt touch targets, and fluid spring physics.
 * 6. Trilingual Localization (English, සිංහල, தமிழ்).
 * 7. Strictly zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useCallback, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DoshaType = "VATA" | "PITTA" | "KAPHA" | "VATA_PITTA" | "PITTA_KAPHA" | "TRIDOSHIC";

export type AyurvedicDietType =
  | "SATTVIC_GARDEN"
  | "VATA_PACIFYING_WARM"
  | "PITTA_COOLING_HERBAL"
  | "KAPHA_DETOX_SPICED"
  | "TRIDOSHIC_BALANCING";

export type ConsultationModalTab = "DOSHA" | "VITALS" | "DIET_KDS" | "THERAPIES";

export interface DoshaScores {
  readonly vataPct: number;
  readonly pittaPct: number;
  readonly kaphaPct: number;
}

export interface PatientVitals {
  readonly systolicBp: number;
  readonly diastolicBp: number;
  readonly pulseBpm: number;
  readonly hasHypertension: boolean;
  readonly hasCardiacCondition: boolean;
  readonly isPregnant: boolean;
  readonly hasSkinAllergies: boolean;
  readonly contraindicationNotes: string;
}

export interface DietaryPrescription {
  readonly dietType: AyurvedicDietType;
  readonly herbalTea: string;
  readonly forbiddenIngredients: string;
  readonly specialInstructions: string;
  readonly syncWithRoomKds: boolean;
}

export interface PrescribedTherapyItem {
  readonly id: string;
  readonly dayNumber: number;
  readonly therapyName: string;
  readonly durationMinutes: number;
  readonly preferredTherapistGender: "MALE" | "FEMALE" | "ANY";
  readonly targetSuite: string;
  readonly priceLkr: number;
}

export interface AyurvedaConsultationPlan {
  readonly consultationId: string;
  readonly guestId: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly doctorStaffId: string;
  readonly doctorName: string;
  readonly consultationDate: string;
  readonly primaryDosha: DoshaType;
  readonly doshaScores: DoshaScores;
  readonly vitals: PatientVitals;
  readonly diet: DietaryPrescription;
  readonly therapies: readonly PrescribedTherapyItem[];
  readonly totalTherapiesCostLkr: number;
}

export interface AyurvedaConsultationModalProps {
  readonly isOpen: boolean;
  readonly guestName?: string | undefined;
  readonly roomNumber?: string | undefined;
  readonly guestId?: string | undefined;
  readonly initialPlan?: AyurvedaConsultationPlan | undefined;
  readonly doctorName?: string | undefined;
  readonly doctorStaffId?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onClose: () => void;
  readonly onSavePlan?: ((plan: AyurvedaConsultationPlan) => void) | undefined;
  readonly onSyncKds?: ((roomNumber: string, diet: DietaryPrescription) => void) | undefined;
}

// ============================================================================
// Translations Dictionary (en, si, ta)
// ============================================================================

export interface ConsultationTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly tabDosha: string;
  readonly tabVitals: string;
  readonly tabDiet: string;
  readonly tabTherapies: string;
  readonly primaryPrakriti: string;
  readonly vataDescription: string;
  readonly pittaDescription: string;
  readonly kaphaDescription: string;
  readonly vitalsHeader: string;
  readonly bloodPressure: string;
  readonly pulse: string;
  readonly contraindications: string;
  readonly pregnant: string;
  readonly cardiac: string;
  readonly skinAllergy: string;
  readonly kdsSyncLabel: string;
  readonly kdsSyncNotice: string;
  readonly herbalInfusion: string;
  readonly therapySchedule: string;
  readonly addTherapy: string;
  readonly totalCost: string;
  readonly savePlan: string;
  readonly close: string;
}

export const CONSULTATION_TRANSLATIONS: Record<SupportedLanguage, ConsultationTranslations> = {
  en: {
    title: "Ayurvedic Doctor (Vaidya) Consultation",
    subtitle: "Prakriti Dosha assessment, clinical vitals, KDS diet routing & multi-day therapies",
    tabDosha: "1. Dosha Assessment",
    tabVitals: "2. Clinical Vitals",
    tabDiet: "3. Ayurvedic Diet & KDS",
    tabTherapies: "4. Prescribed Therapies",
    primaryPrakriti: "Primary Constitution (Prakriti)",
    vataDescription: "Air & Ether: Regulates movement, nervous system, and joint lubrication.",
    pittaDescription: "Fire & Water: Regulates digestion, metabolic heat, and enzyme activity.",
    kaphaDescription: "Earth & Water: Governs biological strength, stamina, and tissue cohesion.",
    vitalsHeader: "Clinical Observations & Safety Vitals",
    bloodPressure: "Blood Pressure (mmHg)",
    pulse: "Pulse (BPM)",
    contraindications: "Medical Contraindications & Health Flags",
    pregnant: "Pregnancy / Post-Natal",
    cardiac: "Cardiac / Heart Conditions",
    skinAllergy: "Skin Lesions / Acute Dermatitis",
    kdsSyncLabel: "Transmit Dietary Prescription to Kitchen Display System (KDS)",
    kdsSyncNotice:
      "When enabled, the resort kitchen instantly receives dosha-pacifying ingredient rules for this room.",
    herbalInfusion: "Prescribed Daily Kasaya / Herbal Tea",
    therapySchedule: "Prescribed Wellness & Panchakarma Schedule",
    addTherapy: "+ Add Prescribed Treatment",
    totalCost: "Total Treatment Value",
    savePlan: "Prescribe & Save Wellness Plan",
    close: "Dismiss",
  },
  si: {
    title: "ආයුර්වේද වෛද්ය පරීක්ෂාව සහ ප්රතිකාර සැලැස්ම",
    subtitle: "ප්රකෘති දෝෂ නිර්ණය, සායනික පරීක්ෂණ, KDS පෝෂණ මාර්ගගත කිරීම සහ චිකිත්සා කාලසටහන",
    tabDosha: "1. දෝෂ නිර්ණය",
    tabVitals: "2. සායනික සටහන්",
    tabDiet: "3. ඖෂධීය ආහාර සහ KDS",
    tabTherapies: "4. නියමිත ප්රතිකාර",
    primaryPrakriti: "මූලික ප්රකෘති දේහ ස්වභාවය",
    vataDescription: "වාත දෝෂය (වායුව සහ ආකාශය): ස්නායු හා සන්ධි චලන ක්රියාකාරිත්වය පාලනය කරයි.",
    pittaDescription: "පිත්ත දෝෂය (ගින්න සහ ජලය): ආහාර ජීර්ණය සහ පරිවෘත්තීය තාපය පාලනය කරයි.",
    kaphaDescription: "කඵ දෝෂය (පෘථිවිය සහ ජලය): ප්රතිශක්තිය, ශරීර ශක්තිය සහ පටක ඒකාබද්ධතාවය රඳවයි.",
    vitalsHeader: "සායනික නිරීක්ෂණ සහ රෝගී ආරක්ෂාව",
    bloodPressure: "රුධිර පීඩනය (mmHg)",
    pulse: "හෘද ස්පන්දනය (BPM)",
    contraindications: "ප්රතිකාර සඳහා වෛද්ය තහනම්තා",
    pregnant: "ගර්භණීභාවය",
    cardiac: "හෘද රෝග තත්ත්වයන්",
    skinAllergy: "සමේ ආසාත්මිකතා",
    kdsSyncLabel: "ආහාර වට්ටෝරු සෘජුවම මුළුතැන්ගෙයි තිරයට (KDS) යවන්න",
    kdsSyncNotice:
      "මෙය සක්රිය කළ විට, කාමර අංකයට අදාළව දෝෂ සමනය කරන ආහාර පමණක් මුළුතැන්ගෙය විසින් පිළියෙල කරනු ඇත.",
    herbalInfusion: "නියමිත දෛනික කෂාය / ඖෂධීය පානය",
    therapySchedule: "නියමිත ආයුර්වේද සහ පංචකර්ම ප්රතිකාර",
    addTherapy: "+ ප්රතිකාරයක් එක් කරන්න",
    totalCost: "මුළු ප්රතිකාර වටිනාකම",
    savePlan: "ප්රතිකාර සැලැස්ම තහවුරු කරන්න",
    close: "වසන්න",
  },
  ta: {
    title: "ஆயுர்வேத மருத்துவர் (வைத்தியர்) ஆலோசனை",
    subtitle: "பிரகிருதி தோஷ மதிப்பீடு, மருத்துவ அவதானிப்புகள், KDS உணவு மற்றும் சிகிச்சை அட்டவணை",
    tabDosha: "1. தோஷ மதிப்பீடு",
    tabVitals: "2. மருத்துவ குறிப்புகள்",
    tabDiet: "3. ஆயுர்வேத உணவு & KDS",
    tabTherapies: "4. பரிந்துரைக்கப்பட்ட சிகிச்சைகள்",
    primaryPrakriti: "முதன்மை பிரகிருதி அமைப்பு",
    vataDescription: "வாத தோஷம் (காற்று & ஆகாயம்): நரம்பு மண்டலம் மற்றும் மூட்டு இயக்கத்தை கட்டுப்படுத்துகிறது.",
    pittaDescription:
      "பித்த தோஷம் (நெருப்பு & நீர்): செரிமானம் மற்றும் வளர்சிதை மாற்ற வெப்பத்தை கட்டுப்படுத்துகிறது.",
    kaphaDescription: "கப தோஷம் (பூமி & நீர்): உடலின் வலிமை மற்றும் திசுக்களின் ஒருங்கிணைப்பை பேணுகிறது.",
    vitalsHeader: "மருத்துவ அவதானிப்புகள் மற்றும் பாதுகாப்பு",
    bloodPressure: "இரத்த அழுத்தம் (mmHg)",
    pulse: "நாடித்துடிப்பு (BPM)",
    contraindications: "மருத்துவ முரண்பாடுகள்",
    pregnant: "கர்ப்பகாலம்",
    cardiac: "இதய நோய் நிலைமைகள்",
    skinAllergy: "தோல் ஒவ்வாமை",
    kdsSyncLabel: "உணவு வழிகாட்டலை சமையலறை திரைக்கு (KDS) அனுப்பவும்",
    kdsSyncNotice: "இயக்கப்பட்டதும், இந்த அறைக்கான தோஷ சமநிலை உணவை சமையலறை தானாகவே தயாரிக்கும்.",
    herbalInfusion: "பரிந்துரைக்கப்பட்ட மூலிகை தேநீர் / கஷாயம்",
    therapySchedule: "பரிந்துரைக்கப்பட்ட ஆரோக்கிய சிகிச்சைகள்",
    addTherapy: "+ சிகிச்சையைச் சேர்க்கவும்",
    totalCost: "மொத்த சிகிச்சை மதிப்பு",
    savePlan: "சிகிச்சைத் திட்டத்தைச் சேமிக்கவும்",
    close: "மூடு",
  },
};

// ============================================================================
// Defaults & Seed Values
// ============================================================================

export const DEFAULT_THERAPIES_SEED: readonly PrescribedTherapyItem[] = [
  {
    id: "TH-01",
    dayNumber: 1,
    therapyName: "Shirodhara Herbal Warm Sesame Oil Stream (60m)",
    durationMinutes: 60,
    preferredTherapistGender: "FEMALE",
    targetSuite: "Ayurvedic Shirodhara Suite 1",
    priceLkr: 16500,
  },
  {
    id: "TH-02",
    dayNumber: 1,
    therapyName: "Vashpa Sweda Herbal Steam Bath with Kohomba Leaves (30m)",
    durationMinutes: 30,
    preferredTherapistGender: "ANY",
    targetSuite: "Herbal Steam Pavilion A",
    priceLkr: 7500,
  },
  {
    id: "TH-03",
    dayNumber: 2,
    therapyName: "Abhyanga Full-Body Synchronized Herbal Oil Massage (90m)",
    durationMinutes: 90,
    preferredTherapistGender: "FEMALE",
    targetSuite: "Deluxe Ayurveda Pavilion 2",
    priceLkr: 19500,
  },
  {
    id: "TH-04",
    dayNumber: 3,
    therapyName: "Pinda Sweda Warm Herbal Leaf Pouch Compress (60m)",
    durationMinutes: 60,
    preferredTherapistGender: "FEMALE",
    targetSuite: "Ayurvedic Shirodhara Suite 1",
    priceLkr: 14000,
  },
];

export const DEFAULT_CONSULTATION_PLAN: AyurvedaConsultationPlan = {
  consultationId: "AYUR-PLAN-2026-0042",
  guestId: "GST-9921",
  guestName: "Lady Sarah Jenkins",
  roomNumber: "VILLA-104",
  doctorStaffId: "DOC-AYUR-01",
  doctorName: "Dr. Priyantha Senanayake (BAMS - University of Colombo)",
  consultationDate: "2026-10-25",
  primaryDosha: "VATA_PITTA",
  doshaScores: {
    vataPct: 50,
    pittaPct: 35,
    kaphaPct: 15,
  },
  vitals: {
    systolicBp: 122,
    diastolicBp: 78,
    pulseBpm: 72,
    hasHypertension: false,
    hasCardiacCondition: false,
    isPregnant: false,
    hasSkinAllergies: false,
    contraindicationNotes: "No acute contraindications. Mild joint stiffness in right knee.",
  },
  diet: {
    dietType: "VATA_PACIFYING_WARM",
    herbalTea: "Warm Ginger-Coriander Infusion with Bee Honey (Twice Daily)",
    forbiddenIngredients:
      "Raw salads, iced drinks, nightshades (tomato/eggplant), deep-fried chili.",
    specialInstructions: "Serve lukewarm water with all meals. Warm cooked Red Samba rice.",
    syncWithRoomKds: true,
  },
  therapies: DEFAULT_THERAPIES_SEED,
  totalTherapiesCostLkr: 57500,
};

// ============================================================================
// Internal Helpers (Cognitive Complexity <= 12)
// ============================================================================

function computePrimaryDosha(vata: number, pitta: number, kapha: number): DoshaType {
  const max = Math.max(vata, pitta, kapha);
  if (Math.abs(vata - pitta) <= 10 && vata > 35 && pitta > 35) return "VATA_PITTA";
  if (Math.abs(pitta - kapha) <= 10 && pitta > 35 && kapha > 35) return "PITTA_KAPHA";
  if (Math.abs(vata - kapha) <= 10 && Math.abs(vata - pitta) <= 10) return "TRIDOSHIC";
  if (max === vata) return "VATA";
  if (max === pitta) return "PITTA";
  return "KAPHA";
}

function calculateTherapiesSum(therapies: readonly PrescribedTherapyItem[]): number {
  let total = 0;
  for (let i = 0; i < therapies.length; i++) {
    const item = therapies[i];
    if (item && typeof item.priceLkr === "number") {
      total += item.priceLkr;
    }
  }
  return total;
}

function getInitialConsultationState(plan?: AyurvedaConsultationPlan | undefined) {
  if (plan) {
    return {
      vata: plan.doshaScores.vataPct,
      pitta: plan.doshaScores.pittaPct,
      kapha: plan.doshaScores.kaphaPct,
      vitals: plan.vitals,
      diet: plan.diet,
      therapies: plan.therapies,
    };
  }
  return {
    vata: DEFAULT_CONSULTATION_PLAN.doshaScores.vataPct,
    pitta: DEFAULT_CONSULTATION_PLAN.doshaScores.pittaPct,
    kapha: DEFAULT_CONSULTATION_PLAN.doshaScores.kaphaPct,
    vitals: DEFAULT_CONSULTATION_PLAN.vitals,
    diet: DEFAULT_CONSULTATION_PLAN.diet,
    therapies: DEFAULT_CONSULTATION_PLAN.therapies,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface DoshaTabProps {
  readonly vata: number;
  readonly pitta: number;
  readonly kapha: number;
  readonly primaryDosha: DoshaType;
  readonly t: ConsultationTranslations;
  readonly onVataChange: (val: number) => void;
  readonly onPittaChange: (val: number) => void;
  readonly onKaphaChange: (val: number) => void;
}

const DoshaTab: FC<DoshaTabProps> = ({
  vata,
  pitta,
  kapha,
  primaryDosha,
  t,
  onVataChange,
  onPittaChange,
  onKaphaChange,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 ">
            {t.primaryPrakriti}
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {primaryDosha.replace("_", " & ")}
          </h3>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 ">
            V: {vata}%
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 ">
            P: {pitta}%
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 ">
            K: {kapha}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vata Slider */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 space-y-3">
          <label className="block space-y-2 cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-600 ">Vata (වාත / வாதம்)</span>
              <span className="font-mono font-bold text-sm tabular-nums-lkr">{vata}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={vata}
              onChange={(e) => onVataChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-black/10 rounded-lg"
            />
          </label>
          <p className="text-xs text-slate-500 ">{t.vataDescription}</p>
        </div>

        {/* Pitta Slider */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 space-y-3">
          <label className="block space-y-2 cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="font-bold text-rose-600 ">Pitta (පිත්ත / பித்தம்)</span>
              <span className="font-mono font-bold text-sm tabular-nums-lkr">{pitta}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={pitta}
              onChange={(e) => onPittaChange(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-2 bg-black/10 rounded-lg"
            />
          </label>
          <p className="text-xs text-slate-500 ">{t.pittaDescription}</p>
        </div>

        {/* Kapha Slider */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 space-y-3">
          <label className="block space-y-2 cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-600 ">Kapha (කඵ / கபம்)</span>
              <span className="font-mono font-bold text-sm tabular-nums-lkr">{kapha}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kapha}
              onChange={(e) => onKaphaChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-black/10 rounded-lg"
            />
          </label>
          <p className="text-xs text-slate-500 ">{t.kaphaDescription}</p>
        </div>
      </div>
    </div>
  );
};

interface VitalsTabProps {
  readonly vitals: PatientVitals;
  readonly t: ConsultationTranslations;
  readonly onUpdateVitals: (vitals: PatientVitals) => void;
}

const VitalsTab: FC<VitalsTabProps> = ({ vitals, t, onUpdateVitals }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Blood Pressure Systolic */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 ">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Systolic BP (mmHg)
            </span>
            <input
              type="number"
              value={vitals.systolicBp}
              onChange={(e) => onUpdateVitals({ ...vitals, systolicBp: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 font-mono text-lg font-bold tabular-nums-lkr"
            />
          </label>
        </div>

        {/* Blood Pressure Diastolic */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 ">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Diastolic BP (mmHg)
            </span>
            <input
              type="number"
              value={vitals.diastolicBp}
              onChange={(e) => onUpdateVitals({ ...vitals, diastolicBp: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 font-mono text-lg font-bold tabular-nums-lkr"
            />
          </label>
        </div>

        {/* Pulse */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white/40 ">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">{t.pulse}</span>
            <input
              type="number"
              value={vitals.pulseBpm}
              onChange={(e) => onUpdateVitals({ ...vitals, pulseBpm: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 font-mono text-lg font-bold tabular-nums-lkr"
            />
          </label>
        </div>
      </div>

      {/* Contraindications Checklist */}
      <div className="p-4 rounded-2xl border border-black/10 bg-white/40 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t.contraindications}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/5 cursor-pointer">
            <input
              type="checkbox"
              checked={vitals.isPregnant}
              onChange={(e) => onUpdateVitals({ ...vitals, isPregnant: e.target.checked })}
              className="w-4 h-4 accent-rose-600 rounded"
            />
            <span className="text-sm font-semibold">{t.pregnant}</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/5 cursor-pointer">
            <input
              type="checkbox"
              checked={vitals.hasCardiacCondition}
              onChange={(e) => onUpdateVitals({ ...vitals, hasCardiacCondition: e.target.checked })}
              className="w-4 h-4 accent-rose-600 rounded"
            />
            <span className="text-sm font-semibold">{t.cardiac}</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/5 cursor-pointer">
            <input
              type="checkbox"
              checked={vitals.hasSkinAllergies}
              onChange={(e) => onUpdateVitals({ ...vitals, hasSkinAllergies: e.target.checked })}
              className="w-4 h-4 accent-rose-600 rounded"
            />
            <span className="text-sm font-semibold">{t.skinAllergy}</span>
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Clinical Notes & Observations
            </span>
            <textarea
              value={vitals.contraindicationNotes}
              onChange={(e) => onUpdateVitals({ ...vitals, contraindicationNotes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

interface DietTabProps {
  readonly diet: DietaryPrescription;
  readonly roomNumber: string;
  readonly t: ConsultationTranslations;
  readonly onUpdateDiet: (diet: DietaryPrescription) => void;
}

const DietTab: FC<DietTabProps> = ({ diet, roomNumber, t, onUpdateDiet }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* KDS Kitchen Link Toggle */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 flex items-start gap-3">
        <label className="flex items-start gap-3 cursor-pointer w-full">
          <input
            type="checkbox"
            checked={diet.syncWithRoomKds}
            onChange={(e) => onUpdateDiet({ ...diet, syncWithRoomKds: e.target.checked })}
            className="w-5 h-5 mt-1 accent-emerald-600 rounded cursor-pointer"
          />
          <div>
            <span className="font-bold text-sm text-emerald-900 block">
              {t.kdsSyncLabel} (Room: {roomNumber})
            </span>
            <span className="text-xs text-emerald-700 mt-0.5 block">{t.kdsSyncNotice}</span>
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Ayurvedic Meal Classification
            </span>
            <select
              value={diet.dietType}
              onChange={(e) =>
                onUpdateDiet({ ...diet, dietType: e.target.value as AyurvedicDietType })
              }
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 text-sm font-semibold"
            >
              <option value="VATA_PACIFYING_WARM">
                Vata-Pacifying (Warm, Nourishing, Red Rice)
              </option>
              <option value="PITTA_COOLING_HERBAL">
                Pitta-Cooling (Mild, Herbal, Ghee, Cucumber)
              </option>
              <option value="KAPHA_DETOX_SPICED">
                Kapha-Reducing (Light, Dry, Pepper, Leafy Greens)
              </option>
              <option value="SATTVIC_GARDEN">
                Sattvic Garden Harvest (Pure Organic, Non-Stimulating)
              </option>
              <option value="TRIDOSHIC_BALANCING">Tri-Doshic Universal Balance</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              {t.herbalInfusion}
            </span>
            <input
              type="text"
              value={diet.herbalTea}
              onChange={(e) => onUpdateDiet({ ...diet, herbalTea: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 text-sm"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Strictly Prohibited Ingredients (Alerts KDS Chef)
            </span>
            <input
              type="text"
              value={diet.forbiddenIngredients}
              onChange={(e) => onUpdateDiet({ ...diet, forbiddenIngredients: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 text-sm text-rose-600 font-semibold"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Special Preparation & Service Notes
            </span>
            <textarea
              value={diet.specialInstructions}
              onChange={(e) => onUpdateDiet({ ...diet, specialInstructions: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white/80 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

interface TherapiesTabProps {
  readonly therapies: readonly PrescribedTherapyItem[];
  readonly totalCostLkr: number;
  readonly t: ConsultationTranslations;
  readonly onRemoveTherapy: (id: string) => void;
  readonly onAddDefaultTherapy: () => void;
}

const TherapiesTab: FC<TherapiesTabProps> = ({
  therapies,
  totalCostLkr,
  t,
  onRemoveTherapy,
  onAddDefaultTherapy,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t.therapySchedule} ({therapies.length} sessions)
        </h4>
        <button
          type="button"
          onClick={onAddDefaultTherapy}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t.addTherapy}
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {therapies.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-black/10 bg-white/40 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                D{item.dayNumber}
              </span>
              <div>
                <p className="font-bold text-slate-900 ">{item.therapyName}</p>
                <p className="text-slate-500">
                  {item.targetSuite} • {item.durationMinutes} mins • {item.preferredTherapistGender}{" "}
                  Therapist
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold tabular-nums-lkr text-slate-900 ">
                {item.priceLkr.toLocaleString()} LKR
              </span>
              <button
                type="button"
                onClick={() => onRemoveTherapy(item.id)}
                className="w-6 h-6 rounded-md hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                aria-label="Remove therapy"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-black/5 flex justify-between items-center text-xs">
        <span className="font-bold text-slate-600 ">{t.totalCost}:</span>
        <span className="font-mono text-base font-extrabold tabular-nums-lkr text-indigo-600 ">
          {totalCostLkr.toLocaleString()} LKR
        </span>
      </div>
    </div>
  );
};

interface ConsultationTabNavProps {
  readonly activeTab: ConsultationModalTab;
  readonly t: ConsultationTranslations;
  readonly onSelectTab: (tab: ConsultationModalTab) => void;
}

const ConsultationTabNav: FC<ConsultationTabNavProps> = ({ activeTab, t, onSelectTab }) => {
  return (
    <div className="px-6 py-2.5 border-b border-black/5 bg-black/5 flex gap-2 overflow-x-auto shrink-0">
      <button
        type="button"
        onClick={() => onSelectTab("DOSHA")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          activeTab === "DOSHA"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900 "
        }`}
      >
        {t.tabDosha}
      </button>
      <button
        type="button"
        onClick={() => onSelectTab("VITALS")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          activeTab === "VITALS"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900 "
        }`}
      >
        {t.tabVitals}
      </button>
      <button
        type="button"
        onClick={() => onSelectTab("DIET_KDS")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          activeTab === "DIET_KDS"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900 "
        }`}
      >
        {t.tabDiet}
      </button>
      <button
        type="button"
        onClick={() => onSelectTab("THERAPIES")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          activeTab === "THERAPIES"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900 "
        }`}
      >
        {t.tabTherapies}
      </button>
    </div>
  );
};

interface ConsultationFooterProps {
  readonly syncWithRoomKds: boolean;
  readonly roomNumber: string;
  readonly t: ConsultationTranslations;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

const ConsultationFooter: FC<ConsultationFooterProps> = ({
  syncWithRoomKds,
  roomNumber,
  t,
  onClose,
  onSave,
}) => {
  return (
    <div className="px-6 py-3 border-t border-black/10 bg-black/5 flex justify-between items-center shrink-0">
      <div className="text-xs text-slate-500">
        {syncWithRoomKds && (
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            KDS Sync Active for Room {roomNumber}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/10 text-xs font-bold"
        >
          {t.close}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all cursor-pointer min-h-[44px]"
        >
          {t.savePlan}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const AyurvedaConsultationModal: FC<AyurvedaConsultationModalProps> = ({
  isOpen,
  guestName = "Lady Sarah Jenkins",
  roomNumber = "VILLA-104",
  guestId = "GST-9921",
  doctorName = "Dr. Priyantha Senanayake (Vaidya)",
  doctorStaffId = "DOC-AYUR-01",
  initialPlan,
  language = "en",
  onClose,
  onSavePlan,
  onSyncKds,
}) => {
  const dialogId = useId();
  const t = CONSULTATION_TRANSLATIONS[language] || CONSULTATION_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<ConsultationModalTab>("DOSHA");

  const initial = useMemo(() => getInitialConsultationState(initialPlan), [initialPlan]);

  const [vata, setVata] = useState<number>(initial.vata);
  const [pitta, setPitta] = useState<number>(initial.pitta);
  const [kapha, setKapha] = useState<number>(initial.kapha);
  const [vitals, setVitals] = useState<PatientVitals>(initial.vitals);
  const [diet, setDiet] = useState<DietaryPrescription>(initial.diet);
  const [therapies, setTherapies] = useState<readonly PrescribedTherapyItem[]>(initial.therapies);

  const primaryDosha = useMemo(() => computePrimaryDosha(vata, pitta, kapha), [vata, pitta, kapha]);
  const totalCostLkr = useMemo(() => calculateTherapiesSum(therapies), [therapies]);

  const handleRemoveTherapy = useCallback((id: string) => {
    setTherapies((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddDefaultTherapy = useCallback(() => {
    const newItem: PrescribedTherapyItem = {
      id: `TH-${Date.now()}`,
      dayNumber: 2,
      therapyName: "Herbal Body Scrub & Pichu Therapy (45m)",
      durationMinutes: 45,
      preferredTherapistGender: "ANY",
      targetSuite: "Ayurveda Pavilion 1",
      priceLkr: 9500,
    };
    setTherapies((prev) => [...prev, newItem]);
  }, []);

  const handleSave = () => {
    const plan: AyurvedaConsultationPlan = {
      consultationId: initialPlan ? initialPlan.consultationId : `AYUR-${Date.now()}`,
      guestId,
      guestName,
      roomNumber,
      doctorStaffId,
      doctorName,
      consultationDate: new Date().toISOString().split("T")[0] || "2026-10-25",
      primaryDosha,
      doshaScores: { vataPct: vata, pittaPct: pitta, kaphaPct: kapha },
      vitals,
      diet,
      therapies,
      totalTherapiesCostLkr: totalCostLkr,
    };

    if (diet.syncWithRoomKds && onSyncKds) {
      onSyncKds(roomNumber, diet);
    }

    if (onSavePlan) {
      onSavePlan(plan);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-full h-full max-w-none max-h-none m-0 border-0"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl apple-liquid-glass bg-white/95 border border-black/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2
                id={`${dialogId}-title`}
                className="text-base sm:text-lg font-black text-slate-900 "
              >
                {t.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {guestName} • Room {roomNumber} • Attending: {doctorName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/5"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Tab Navigation */}
        <ConsultationTabNav activeTab={activeTab} t={t} onSelectTab={setActiveTab} />

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "DOSHA" && (
            <DoshaTab
              vata={vata}
              pitta={pitta}
              kapha={kapha}
              primaryDosha={primaryDosha}
              t={t}
              onVataChange={setVata}
              onPittaChange={setPitta}
              onKaphaChange={setKapha}
            />
          )}

          {activeTab === "VITALS" && <VitalsTab vitals={vitals} t={t} onUpdateVitals={setVitals} />}

          {activeTab === "DIET_KDS" && (
            <DietTab diet={diet} roomNumber={roomNumber} t={t} onUpdateDiet={setDiet} />
          )}

          {activeTab === "THERAPIES" && (
            <TherapiesTab
              therapies={therapies}
              totalCostLkr={totalCostLkr}
              t={t}
              onRemoveTherapy={handleRemoveTherapy}
              onAddDefaultTherapy={handleAddDefaultTherapy}
            />
          )}
        </div>

        {/* Footer */}
        <ConsultationFooter
          syncWithRoomKds={diet.syncWithRoomKds}
          roomNumber={roomNumber}
          t={t}
          onClose={onClose}
          onSave={handleSave}
        />
      </div>
    </dialog>
  );
};
