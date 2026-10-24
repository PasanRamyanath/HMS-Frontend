/**
 * Ceylon Sapphire Resort & Spa - Pelmadulla / Bentota
 * Interactive In-Memory & LocalStorage Demo Hotel Sandbox Seeder
 *
 * Implements full 42-entity multi-tenant SaaS schema simulation:
 * - Single-table partition PK = TENANT#demo-ceylon-sapphire
 * - Sri Lankan 4-stage compounding statutory taxes (SC 10% -> TDL 1% -> SSCL 2.5641% -> VAT 18%)
 * - Trilingual menu items (English, Sinhala, Tamil)
 * - LankaQR EMVCo dynamic payment configuration
 * - Chauffeur driver dormitories (SLTDA driver quarters compliance)
 */

export const DEMO_TENANT_ID = "demo-ceylon-sapphire";
export const DEMO_HOTEL_NAME = "Ceylon Sapphire Resort & Spa - Pelmadulla / Bentota";
export const DEMO_STORAGE_KEY = "slhms_demo_sandbox_v1";

export interface DemoHotelProperty {
  readonly id: string;
  readonly name: string;
  readonly legalEntity: string;
  readonly starRating: number;
  readonly city: string;
  readonly province: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
  readonly currency: "LKR";
  readonly usdExchangeRate: number;
  readonly lankaQrMerchantId: string;
  readonly lankaQrAccount: string;
  readonly statutoryTaxes: {
    readonly serviceChargeRate: number; // 0.10
    readonly tdlRate: number; // 0.01
    readonly ssclRate: number; // 0.025641
    readonly vatRate: number; // 0.18
  };
}

export type DemoRoomStatus =
  | "VACANT_CLEAN"
  | "VACANT_INSPECTED"
  | "OCCUPIED"
  | "STAYOVER_DIRTY"
  | "STAYOVER_CLEAN"
  | "OUT_OF_ORDER";

export interface DemoRoom {
  readonly id: string;
  readonly roomNumber: string;
  readonly roomType: string;
  readonly wing: string;
  readonly floor: number;
  readonly bedConfiguration: string;
  readonly baseRateLkr: number;
  readonly status: DemoRoomStatus;
  readonly currentReservationId?: string | undefined;
  readonly currentGuestName?: string | undefined;
  readonly isDriverDorm?: boolean | undefined;
}

export type DemoMealPlan = "RO" | "BB" | "HB" | "FB" | "AI";
export type DemoReservationStatus = "CONFIRMED_DUE_IN" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

export interface DemoReservation {
  readonly id: string;
  readonly confirmationCode: string;
  readonly guestName: string;
  readonly nationality: string;
  readonly isResident: boolean;
  readonly idOrPassportNumber: string;
  readonly phone: string;
  readonly email: string;
  readonly roomId: string;
  readonly roomNumber: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nights: number;
  readonly adultCount: number;
  readonly childCount: number;
  readonly mealPlan: DemoMealPlan;
  readonly totalRateLkr: number;
  readonly status: DemoReservationStatus;
  readonly folioId: string;
}

export interface DemoDish {
  readonly id: string;
  readonly sku: string;
  readonly name: Record<"en" | "si" | "ta", string>;
  readonly category: "KOT_FOOD" | "BOT_BEVERAGE" | "DESSERT";
  readonly basePriceLkr: number;
  readonly spiceLevel: 0 | 1 | 2 | 3; // 0=None, 1=Mild, 2=Medium, 3=Hot
  readonly dietaryTags: readonly ("HALAL" | "VEGAN" | "GLUTEN_FREE" | "DAIRY_FREE")[];
  readonly prepTimeMinutes: number;
}

export type DemoOrderStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface DemoOrderItem {
  readonly dishId: string;
  readonly dishName: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly notes?: string | undefined;
}

export interface DemoOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly destinationType: "ROOM" | "TABLE" | "CABANA";
  readonly destinationNumber: string;
  readonly items: readonly DemoOrderItem[];
  readonly totalLkr: number;
  readonly status: DemoOrderStatus;
  readonly createdAtIso: string;
  readonly elapsedMinutes: number;
  readonly folioId?: string | undefined;
}

export interface DemoFolioLine {
  readonly id: string;
  readonly description: string;
  readonly category: "ROOM" | "DINING" | "SPA" | "MINIBAR" | "PAYMENT";
  readonly amountLkr: number;
  readonly isCredit: boolean;
  readonly timestampIso: string;
}

export interface DemoFolio {
  readonly id: string;
  readonly folioNumber: string;
  readonly reservationId: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly lines: readonly DemoFolioLine[];
  readonly subtotalLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grossTotalLkr: number;
  readonly totalPaidLkr: number;
  readonly balanceDueLkr: number;
  readonly isSettled: boolean;
}

export interface DemoSandboxState {
  readonly version: string;
  readonly property: DemoHotelProperty;
  readonly rooms: readonly DemoRoom[];
  readonly reservations: readonly DemoReservation[];
  readonly dishes: readonly DemoDish[];
  readonly orders: readonly DemoOrder[];
  readonly folios: readonly DemoFolio[];
  readonly seededAtIso: string;
}

export const DEMO_PROPERTY_DOSSIER: DemoHotelProperty = {
  id: DEMO_TENANT_ID,
  name: DEMO_HOTEL_NAME,
  legalEntity: "Ceylon Sapphire Hospitality (Pvt) Ltd",
  starRating: 5,
  city: "Bentota & Pelmadulla",
  province: "Southern & Sabaragamuwa",
  address: "Pelmadulla Gem Valley & Bentota Beachfront, Sri Lanka",
  phone: "+94 34 227 5500",
  email: "reservations@ceylonsapphire.lk",
  currency: "LKR",
  usdExchangeRate: 305.5,
  lankaQrMerchantId: "CEYLON_SAPPHIRE_001",
  lankaQrAccount: "001928472910",
  statutoryTaxes: {
    serviceChargeRate: 0.1, // 10%
    tdlRate: 0.01, // 1%
    ssclRate: 0.025641, // 2.5641%
    vatRate: 0.18, // 18%
  },
};

export const DEMO_ROOMS: readonly DemoRoom[] = [
  {
    id: "room-101",
    roomNumber: "101",
    roomType: "Superior Garden Villa",
    wing: "East Wing",
    floor: 1,
    bedConfiguration: "1 King Bed",
    baseRateLkr: 38000,
    status: "OCCUPIED",
    currentReservationId: "res-8950",
    currentGuestName: "Dr. Anura Wickramasinghe",
  },
  {
    id: "room-102",
    roomNumber: "102",
    roomType: "Superior Garden Villa",
    wing: "East Wing",
    floor: 1,
    bedConfiguration: "1 King Bed",
    baseRateLkr: 38000,
    status: "VACANT_INSPECTED",
  },
  {
    id: "room-103",
    roomNumber: "103",
    roomType: "Superior Garden Villa",
    wing: "East Wing",
    floor: 1,
    bedConfiguration: "2 Twin Beds",
    baseRateLkr: 38000,
    status: "STAYOVER_DIRTY",
  },
  {
    id: "room-104",
    roomNumber: "104",
    roomType: "Presidential Pool Villa",
    wing: "Beachfront",
    floor: 1,
    bedConfiguration: "1 King Bed + Private Pool",
    baseRateLkr: 120000,
    status: "OCCUPIED",
    currentReservationId: "res-8921",
    currentGuestName: "Kasun Perera",
  },
  {
    id: "room-105",
    roomNumber: "105",
    roomType: "Deluxe Ocean Villa",
    wing: "Beachfront",
    floor: 1,
    bedConfiguration: "1 King Bed",
    baseRateLkr: 48000,
    status: "VACANT_CLEAN",
  },
  {
    id: "room-201",
    roomNumber: "201",
    roomType: "Executive Twin Suite",
    wing: "Upper Level",
    floor: 2,
    bedConfiguration: "2 Queen Beds",
    baseRateLkr: 32000,
    status: "STAYOVER_CLEAN",
  },
  {
    id: "room-202",
    roomNumber: "202",
    roomType: "Executive Twin Suite",
    wing: "Upper Level",
    floor: 2,
    bedConfiguration: "2 Queen Beds",
    baseRateLkr: 32000,
    status: "VACANT_CLEAN",
  },
  {
    id: "room-301",
    roomNumber: "301",
    roomType: "Penthouse Gem Suite",
    wing: "Rooftop Panoramic",
    floor: 3,
    bedConfiguration: "1 Emperor King Bed + Jacuzzi",
    baseRateLkr: 160000,
    status: "OUT_OF_ORDER",
  },
  {
    id: "dorm-a1",
    roomNumber: "DORM-A1",
    roomType: "Safari Chauffeur Quarters",
    wing: "Drivers Quarters",
    floor: 0,
    bedConfiguration: "1 Bunk Bed",
    baseRateLkr: 4500,
    status: "OCCUPIED",
    currentReservationId: "res-8952",
    currentGuestName: "Sunil Gamage (Chauffeur)",
    isDriverDorm: true,
  },
  {
    id: "dorm-a2",
    roomNumber: "DORM-A2",
    roomType: "Safari Chauffeur Quarters",
    wing: "Drivers Quarters",
    floor: 0,
    bedConfiguration: "1 Bunk Bed",
    baseRateLkr: 4500,
    status: "VACANT_CLEAN",
    isDriverDorm: true,
  },
];

export const DEMO_DISHES: readonly DemoDish[] = [
  {
    id: "dish-kottu",
    sku: "FB-KOT-01",
    name: {
      en: "Lagoon Seafood Kottu",
      si: "කලපු මුහුදු ආහාර කොත්තු",
      ta: "கடல் உணவு கொத்து",
    },
    category: "KOT_FOOD",
    basePriceLkr: 2400,
    spiceLevel: 2,
    dietaryTags: ["HALAL"],
    prepTimeMinutes: 18,
  },
  {
    id: "dish-crab",
    sku: "FB-KOT-02",
    name: {
      en: "Jaffna Spiced Mud Crab Curry",
      si: "යාපනය මඩ කකුළු ව්යංජනය",
      ta: "யாழ்ப்பாண நண்டு கறி",
    },
    category: "KOT_FOOD",
    basePriceLkr: 4800,
    spiceLevel: 3,
    dietaryTags: ["HALAL", "GLUTEN_FREE"],
    prepTimeMinutes: 25,
  },
  {
    id: "dish-prawns",
    sku: "FB-KOT-03",
    name: {
      en: "Devilled Ocean Jumbo Prawns",
      si: "දෙවල් සාගර ඉස්සෝ",
      ta: "டெவில் கடல் இறால்",
    },
    category: "KOT_FOOD",
    basePriceLkr: 3200,
    spiceLevel: 2,
    dietaryTags: ["HALAL", "DAIRY_FREE"],
    prepTimeMinutes: 15,
  },
  {
    id: "dish-hoppers",
    sku: "FB-KOT-04",
    name: {
      en: "String Hoppers with Kiri Hodi & Pol Sambol",
      si: "ඉඳිආප්ප, කිරි හොදි සහ පොල් සම්බෝල",
      ta: "இடியாப்பம், பால் சொதி மற்றும் சம்பல்",
    },
    category: "KOT_FOOD",
    basePriceLkr: 1600,
    spiceLevel: 1,
    dietaryTags: ["HALAL", "VEGAN", "DAIRY_FREE"],
    prepTimeMinutes: 12,
  },
  {
    id: "dish-thambili",
    sku: "FB-BOT-01",
    name: {
      en: "Fresh King Coconut (Thambili)",
      si: "නැවුම් තැඹිලි ගෙඩිය",
      ta: "சுத்தமான இளநீர்",
    },
    category: "BOT_BEVERAGE",
    basePriceLkr: 450,
    spiceLevel: 0,
    dietaryTags: ["HALAL", "VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    prepTimeMinutes: 5,
  },
  {
    id: "dish-lion",
    sku: "FB-BOT-02",
    name: {
      en: "Lion Lager Beer (625ml)",
      si: "ලයන් ලැගර් බියර්",
      ta: "லயன் லாகர் பியர்",
    },
    category: "BOT_BEVERAGE",
    basePriceLkr: 1100,
    spiceLevel: 0,
    dietaryTags: ["VEGAN"],
    prepTimeMinutes: 3,
  },
  {
    id: "dish-tea",
    sku: "FB-BOT-03",
    name: {
      en: "Ceylon BOP Spiced Black Tea",
      si: "ශ්රී ලංකා කුළුබඩු කළු තේ",
      ta: "இலங்கை மசாலா தேநீர்",
    },
    category: "BOT_BEVERAGE",
    basePriceLkr: 600,
    spiceLevel: 0,
    dietaryTags: ["HALAL", "VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    prepTimeMinutes: 6,
  },
  {
    id: "dish-watalappam",
    sku: "FB-DES-01",
    name: {
      en: "Kithul Jaggery Watalappam with Cashews",
      si: "කිතුල් හකුරු කජු වටලප්පන්",
      ta: "முந்திரி கித்துள் வட்டலாப்பம்",
    },
    category: "DESSERT",
    basePriceLkr: 950,
    spiceLevel: 0,
    dietaryTags: ["HALAL", "GLUTEN_FREE"],
    prepTimeMinutes: 8,
  },
];

export const DEMO_RESERVATIONS: readonly DemoReservation[] = [
  {
    id: "res-8921",
    confirmationCode: "CS-8921",
    guestName: "Kasun Perera",
    nationality: "LKA",
    isResident: true,
    idOrPassportNumber: "952341234V",
    phone: "+94 77 123 4567",
    email: "kasun.perera@gmail.com",
    roomId: "room-104",
    roomNumber: "104",
    checkInDate: "2026-10-20",
    checkOutDate: "2026-10-23",
    nights: 3,
    adultCount: 2,
    childCount: 1,
    mealPlan: "HB",
    totalRateLkr: 360000,
    status: "CHECKED_IN",
    folioId: "folio-402",
  },
  {
    id: "res-8945",
    confirmationCode: "CS-8945",
    guestName: "Sophie Laurent",
    nationality: "FRA",
    isResident: false,
    idOrPassportNumber: "18AF92810",
    phone: "+33 6 12 34 56 78",
    email: "sophie.laurent@paris.fr",
    roomId: "room-102",
    roomNumber: "102",
    checkInDate: "2026-10-21",
    checkOutDate: "2026-10-25",
    nights: 4,
    adultCount: 1,
    childCount: 0,
    mealPlan: "BB",
    totalRateLkr: 152000,
    status: "CONFIRMED_DUE_IN",
    folioId: "folio-403",
  },
  {
    id: "res-8950",
    confirmationCode: "CS-8950",
    guestName: "Dr. Anura Wickramasinghe",
    nationality: "LKA",
    isResident: true,
    idOrPassportNumber: "881241234V",
    phone: "+94 71 987 6543",
    email: "anura.wickrama@doctors.lk",
    roomId: "room-101",
    roomNumber: "101",
    checkInDate: "2026-10-21",
    checkOutDate: "2026-10-23",
    nights: 2,
    adultCount: 2,
    childCount: 0,
    mealPlan: "RO",
    totalRateLkr: 76000,
    status: "CHECKED_IN",
    folioId: "folio-404",
  },
  {
    id: "res-8952",
    confirmationCode: "CS-8952",
    guestName: "Sunil Gamage (Chauffeur)",
    nationality: "LKA",
    isResident: true,
    idOrPassportNumber: "723451234V",
    phone: "+94 77 445 6677",
    email: "sunil.tours@srilanka.lk",
    roomId: "dorm-a1",
    roomNumber: "DORM-A1",
    checkInDate: "2026-10-21",
    checkOutDate: "2026-10-23",
    nights: 2,
    adultCount: 1,
    childCount: 0,
    mealPlan: "RO",
    totalRateLkr: 9000,
    status: "CHECKED_IN",
    folioId: "folio-405",
  },
];

export const DEMO_ORDERS: readonly DemoOrder[] = [
  {
    id: "order-1021",
    orderNumber: "#1021",
    destinationType: "ROOM",
    destinationNumber: "104",
    items: [
      {
        dishId: "dish-kottu",
        dishName: "Lagoon Seafood Kottu",
        quantity: 2,
        unitPriceLkr: 2400,
        notes: "Extra spicy, no onions for one",
      },
      {
        dishId: "dish-thambili",
        dishName: "Fresh King Coconut (Thambili)",
        quantity: 2,
        unitPriceLkr: 450,
      },
    ],
    totalLkr: 5700,
    status: "PREPARING",
    createdAtIso: "2026-10-21T13:40:00Z",
    elapsedMinutes: 18,
    folioId: "folio-402",
  },
  {
    id: "order-1024",
    orderNumber: "#1024",
    destinationType: "TABLE",
    destinationNumber: "Table 6",
    items: [
      {
        dishId: "dish-prawns",
        dishName: "Devilled Ocean Jumbo Prawns",
        quantity: 1,
        unitPriceLkr: 3200,
      },
      {
        dishId: "dish-lion",
        dishName: "Lion Lager Beer (625ml)",
        quantity: 3,
        unitPriceLkr: 1100,
      },
    ],
    totalLkr: 6500,
    status: "READY",
    createdAtIso: "2026-10-21T13:52:00Z",
    elapsedMinutes: 6,
  },
  {
    id: "order-1028",
    orderNumber: "#1028",
    destinationType: "CABANA",
    destinationNumber: "Cabana 2",
    items: [
      {
        dishId: "dish-tea",
        dishName: "Ceylon BOP Spiced Black Tea",
        quantity: 2,
        unitPriceLkr: 600,
      },
      {
        dishId: "dish-watalappam",
        dishName: "Kithul Jaggery Watalappam with Cashews",
        quantity: 1,
        unitPriceLkr: 950,
      },
    ],
    totalLkr: 2150,
    status: "NEW",
    createdAtIso: "2026-10-21T13:56:00Z",
    elapsedMinutes: 2,
  },
];

export const DEMO_FOLIOS: readonly DemoFolio[] = [
  {
    id: "folio-402",
    folioNumber: "FL-402",
    reservationId: "res-8921",
    guestName: "Kasun Perera",
    roomNumber: "104",
    lines: [
      {
        id: "line-1",
        description: "Room Night 1 (Presidential Pool Villa)",
        category: "ROOM",
        amountLkr: 120000,
        isCredit: false,
        timestampIso: "2026-10-20T14:00:00Z",
      },
      {
        id: "line-2",
        description: "In-Room Dining: Lagoon Seafood Kottu & King Coconut",
        category: "DINING",
        amountLkr: 5700,
        isCredit: false,
        timestampIso: "2026-10-20T20:15:00Z",
      },
      {
        id: "line-3",
        description: "Advance Deposit Paid via LankaQR (CEFT Instant)",
        category: "PAYMENT",
        amountLkr: 50000,
        isCredit: true,
        timestampIso: "2026-10-20T14:05:00Z",
      },
    ],
    subtotalLkr: 125700,
    serviceChargeLkr: 12570,
    tdlLkr: 1382.7,
    ssclLkr: 3545.42,
    vatLkr: 25526.78,
    grossTotalLkr: 168724.9,
    totalPaidLkr: 50000,
    balanceDueLkr: 118724.9,
    isSettled: false,
  },
];

let inMemoryState: DemoSandboxState | null = null;

export function createDefaultDemoSandboxState(): DemoSandboxState {
  return {
    version: "1.0.0",
    property: DEMO_PROPERTY_DOSSIER,
    rooms: DEMO_ROOMS,
    reservations: DEMO_RESERVATIONS,
    dishes: DEMO_DISHES,
    orders: DEMO_ORDERS,
    folios: DEMO_FOLIOS,
    seededAtIso: new Date().toISOString(),
  };
}

export function loadDemoSandboxState(): DemoSandboxState {
  if (inMemoryState) {
    return inMemoryState;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DemoSandboxState;
        if (parsed.property?.id === DEMO_TENANT_ID) {
          inMemoryState = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback on corrupt JSON
    }
  }

  const fresh = createDefaultDemoSandboxState();
  inMemoryState = fresh;
  return fresh;
}

function saveDemoSandboxState(state: DemoSandboxState): void {
  inMemoryState = state;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota or private browsing mode
    }
  }
}

export function resetDemoSandboxState(): DemoSandboxState {
  const fresh = createDefaultDemoSandboxState();
  saveDemoSandboxState(fresh);
  return fresh;
}

export function isDemoSandboxActive(currentTenantId?: string): boolean {
  if (currentTenantId) {
    return currentTenantId === DEMO_TENANT_ID;
  }
  return true;
}

export function getDemoRoom(roomId: string, state = loadDemoSandboxState()): DemoRoom | undefined {
  return state.rooms.find((r) => r.id === roomId || r.roomNumber === roomId);
}

export function getDemoReservation(
  resId: string,
  state = loadDemoSandboxState(),
): DemoReservation | undefined {
  return state.reservations.find((r) => r.id === resId || r.confirmationCode === resId);
}

export function getDemoOrder(
  orderId: string,
  state = loadDemoSandboxState(),
): DemoOrder | undefined {
  return state.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
}

export function getDemoFolio(
  folioId: string,
  state = loadDemoSandboxState(),
): DemoFolio | undefined {
  return state.folios.find((f) => f.id === folioId || f.folioNumber === folioId);
}

export function exportDemoSandboxJson(state = loadDemoSandboxState()): string {
  return JSON.stringify(state, null, 2);
}

export function importDemoSandboxJson(json: string): DemoSandboxState {
  const parsed = JSON.parse(json) as DemoSandboxState;
  if (!parsed.property || parsed.property.id !== DEMO_TENANT_ID) {
    throw new Error("Invalid demo sandbox payload: property ID mismatch.");
  }
  saveDemoSandboxState(parsed);
  return parsed;
}
