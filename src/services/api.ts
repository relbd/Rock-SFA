const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbzwEOVKcH_FWTtHsD0Hm1ktlhYQVp9Ic01cuZiJ5lFtZ8WQdKDuxBV9sRdOPe89mloQ/exec";
const API_URL = (process.env.NEXT_PUBLIC_API_URL && 
  !process.env.NEXT_PUBLIC_API_URL.includes("AKfycbySHcMi") && 
  !process.env.NEXT_PUBLIC_API_URL.includes("AKfycbxAhZDJ") && 
  !process.env.NEXT_PUBLIC_API_URL.includes("AKfycbz0IYOw"))
  ? process.env.NEXT_PUBLIC_API_URL
  : DEPLOYMENT_URL;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 45000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }, timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      throw new Error("Connection timed out. Please check network connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function post<T>(payload: Record<string, unknown>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error("API error " + res.status + ": " + text.slice(0, 200));
      }
      return res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Unknown error");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Request failed after retries");
}

async function postSingle<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetchWithTimeout(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("API error " + res.status + ": " + text.slice(0, 200));
  }
  return res.json();
}

async function get<T>(params: Record<string, string>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = new URL(API_URL);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetchWithTimeout(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error("API error " + res.status + ": " + text.slice(0, 200));
      }
      return res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Unknown error");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Request failed after retries");
}

export interface LoginUser {
  userId: string;
  email: string;
  employeeName: string;
  employeeCode: string;
  position: string;
  department: string;
  territory: string;
  area: string;
  district: string;
  phone: string;
  reportingManager: string;
  activeStatus: string;
  profilePhotoUrl: string;
}

export interface LoginResponse {
  success: boolean;
  user?: LoginUser;
  message?: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
}

export interface MasterData {
  districts: string[];
  areas: Array<{ district: string; area: string }>;
  territories: Array<{ area: string; territory: string }>;
  employees: Array<{ email: string; employeeName: string; employeeCode: string; position: string; territory: string }>;
  settings: Record<string, string>;
}

export interface MasterDataResponse {
  success: boolean;
  data?: MasterData;
}

export interface CustomerRegistrationResponse {
  success: boolean;
  customerId?: string;
  message?: string;
}

export interface CustomerListItem {
  customerId: string;
  shopName: string;
  ownerName: string;
  ownerContact: string;
  marketName: string;
  district: string;
  area: string;
  territory: string;
  shopType: string;
  fullAddress: string;
  latitude: string;
  longitude: string;
  salesOfficer: string;
  email: string;
  status: string;
}

export interface CustomerListResponse {
  success: boolean;
  data?: CustomerListItem[];
}

export interface VisitResponse {
  success: boolean;
  visitId?: string;
  message?: string;
}

export interface VisitData {
  email: string;
  salesOfficer: string;
  salesPersonName: string;
  territory: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  district: string;
  area: string;
  customerType: string;
  marketName: string;
  totalQuantity: number;
  orderDeliveryDate?: string;
  orderNotReceived?: string;
  otherDetails?: string;
  brandFocus: string;
  otherBrand?: string;
  castrolInventory?: string;
  comments?: string;
  lat?: number;
  lng?: number;
  gpsAccuracy?: number;
  storeLat?: string;
  storeLng?: string;
  distance?: number;
  visitResult?: string;
  visitStatus?: string;
  selfieBase64?: string;
}

export interface ProductItem {
  productId: string;
  productName: string;
  category: string;
  packSize: string;
  pricePerLiter: number;
  canPailDrum: number;
  cartoonPrice: number;
  status: string;
}

export interface ProductListResponse {
  success: boolean;
  data?: ProductItem[];
}

export interface SubDBItem {
  zone: string;
  sapId: string;
  area: string;
  subDbName: string;
  status: string;
}

export interface SubDBListResponse {
  success: boolean;
  data?: SubDBItem[];
}

export interface OrderProduct {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
}

export interface OrderData {
  email: string;
  dsr: string;
  employeeName: string;
  territory: string;
  customerId: string;
  customerName: string;
  sapId: string;
  zone: string;
  area: string;
  distributorName: string;
  category: string;
  products: OrderProduct[];
  attachmentBase64?: string;
  attachmentType?: string;
}

export interface OrderResponse {
  success: boolean;
  invoiceId?: string;
  message?: string;
  debug?: string;
}

export interface DashboardVisit {
  visitId: string;
  timestamp: string;
  customerCode: string;
  customerName: string;
  area: string;
  city: string;
  latitude: string;
  longitude: string;
  brandFocus: string;
  totalQuantity: number;
  visitResult: string;
  orderNotReceived: string;
  marketName: string;
}

export interface DashboardOrder {
  invoiceId: string;
  customerName: string;
  productName: string;
  quantity: number;
  createdAt: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
  time: string;
  area: string;
}

export interface DashboardData {
  today: string;
  visits: DashboardVisit[];
  visitCount: number;
  orders: DashboardOrder[];
  orderCount: number;
  totalOrderQty: number;
  clockIn: string;
  clockOut: string;
  route: RoutePoint[];
  totalDistanceKm: number;
  areasVisited: string[];
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  message?: string;
}

export interface ReportVisit {
  visitId: string;
  timestamp: string;
  date: string;
  customerCode: string;
  customerName: string;
  area: string;
  city: string;
  latitude: string;
  longitude: string;
  brandFocus: string;
  totalQuantity: number;
  visitResult: string;
  orderNotReceived: string;
  marketName: string;
  territory: string;
  visitStatus: string;
}

export interface ReportOrder {
  invoiceId: string;
  customerName: string;
  customerId: string;
  productName: string;
  productId: string;
  quantity: number;
  createdAt: string;
  date: string;
  orderStatus: string;
  distributorName?: string;
  orderMonth?: number;
  orderYear?: number;
}

export interface ReportAttendance {
  type: string;
  timestamp: string;
  date: string;
}

export interface ReportRoutePoint {
  lat: number;
  lng: number;
  name: string;
  time: string;
  area: string;
  date: string;
}

export interface ReportDailySummary {
  date: string;
  visits: number;
  orders: number;
  qty: number;
}

export interface ReportTopProduct {
  name: string;
  qty: number;
  count: number;
}

export interface ReportTopCustomer {
  name: string;
  qty: number;
  count: number;
}

export interface ReportAreaBreakdown {
  area: string;
  visits: number;
}

export interface ReportBrandBreakdown {
  brand: string;
  visits: number;
}

export interface ReportSummary {
  totalVisits: number;
  totalOrders: number;
  totalOrderQty: number;
  totalDistanceKm: number;
  activeDays: number;
  totalClockIns: number;
  uniqueAreas: number;
  uniqueCustomers: number;
  avgQtyPerVisit: number;
  avgVisitsPerDay: number;
}

export interface ReportData {
  startDate: string;
  endDate: string;
  summary: ReportSummary;
  visits: ReportVisit[];
  orders: ReportOrder[];
  attendance: ReportAttendance[];
  route: ReportRoutePoint[];
  dailySummary: ReportDailySummary[];
  topProducts: ReportTopProduct[];
  topCustomers: ReportTopCustomer[];
  areaBreakdown: ReportAreaBreakdown[];
  brandBreakdown: ReportBrandBreakdown[];
}

export interface ReportResponse {
  success: boolean;
  data?: ReportData;
  message?: string;
}

export interface ActiveUser {
  userId: string;
  employeeName: string;
  employeeCode: string;
  position: string;
  area: string;
  territory: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface PresenceResponse {
  success: boolean;
  users?: ActiveUser[];
  totalCount?: number;
  onlineCount?: number;
}

const memoryCache: Record<string, { timestamp: number; data: unknown }> = {};

function invalidateCache(key?: string) {
  if (key) {
    delete memoryCache[key];
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } catch {
        // ignore storage errors
      }
    }
  } else {
    Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
    if (typeof window !== "undefined") {
      try {
        ["cache_master_data", "cache_customers", "cache_products", "cache_sub_dbs"].forEach((k) => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });
      } catch {
        // ignore storage errors
      }
    }
  }
}

async function getCachedOrFetch<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>,
  forceRefresh = false
): Promise<T> {
  const now = Date.now();
  if (!forceRefresh && memoryCache[key] && now - memoryCache[key].timestamp < ttlMs) {
    return memoryCache[key].data as T;
  }

  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < ttlMs) {
          memoryCache[key] = parsed;
          if (now - parsed.timestamp > ttlMs / 2) {
            fetchFn().then((res) => {
              if (res && (res as Record<string, unknown>).success) {
                memoryCache[key] = { timestamp: Date.now(), data: res };
                try {
                  sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: res }));
                  localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: res }));
                } catch { /* ignore */ }
              }
            }).catch(() => {});
          }
          return parsed.data as T;
        }
      }
    } catch {
      // ignore
    }
  }

  const result = await fetchFn();
  if (result && (result as Record<string, unknown>).success) {
    memoryCache[key] = { timestamp: now, data: result };
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(key, JSON.stringify({ timestamp: now, data: result }));
        localStorage.setItem(key, JSON.stringify({ timestamp: now, data: result }));
      } catch {
        // ignore
      }
    }
  }
  return result;
}

export const api = {
  login(email: string, password: string) {
    return post<LoginResponse>({ action: "login", email, password });
  },

  clockIn(userId: string, lat: number, lng: number, imageBase64?: string) {
    return postSingle<AttendanceResponse>({ action: "clockIn", userId, lat, lng, imageBase64 });
  },

  clockOut(userId: string, lat: number, lng: number, imageBase64?: string) {
    return postSingle<AttendanceResponse>({ action: "clockOut", userId, lat, lng, imageBase64 });
  },

  getMasterData(forceRefresh = false) {
    return getCachedOrFetch<MasterDataResponse>(
      "cache_master_data",
      30 * 60 * 1000,
      () => post<MasterDataResponse>({ action: "getMasterData" }),
      forceRefresh
    );
  },

  getCustomers(forceRefresh = false) {
    return getCachedOrFetch<CustomerListResponse>(
      "cache_customers",
      15 * 60 * 1000,
      () => post<CustomerListResponse>({ action: "getCustomers" }),
      forceRefresh
    );
  },

  getProducts(forceRefresh = false) {
    return getCachedOrFetch<ProductListResponse>(
      "cache_products",
      30 * 60 * 1000,
      () => post<ProductListResponse>({ action: "getProducts" }),
      forceRefresh
    );
  },

  getSubDBs(forceRefresh = false) {
    return getCachedOrFetch<SubDBListResponse>(
      "cache_sub_dbs",
      30 * 60 * 1000,
      () => post<SubDBListResponse>({ action: "getSubDBs" }),
      forceRefresh
    );
  },

  async submitVisit(data: VisitData) {
    const res = await postSingle<VisitResponse>({ action: "submitVisit", ...data });
    if (res.success) invalidateCache("cache_customers");
    return res;
  },

  async submitOrder(data: OrderData) {
    const res = await postSingle<OrderResponse>({ action: "submitOrder", ...data });
    if (res.success) invalidateCache("cache_customers");
    return res;
  },

  getDashboardData(email: string) {
    return post<DashboardResponse>({ action: "getDashboardData", email });
  },

  getReportData(email: string, startDate?: string, endDate?: string) {
    return post<ReportResponse>({ action: "getReportData", email, startDate, endDate });
  },

  async registerCustomer(data: {
    email: string;
    district: string;
    area: string;
    marketName: string;
    shopName: string;
    shopType: string;
    fullAddress: string;
    ownerName: string;
    ownerContact: string;
    oilBrandSelling: string;
    totalAvgVolume: number;
    salesOfficer?: string;
    territory?: string;
    nid?: string;
    etin?: string;
    bin?: string;
    otherBrand?: string;
    avgCastrolVolume?: number;
    comment?: string;
    lat?: number;
    lng?: number;
    gpsAccuracy?: number;
    shopPhotoBase64?: string;
  }) {
    const res = await postSingle<CustomerRegistrationResponse>({ action: "registerCustomer", ...data });
    if (res.success) invalidateCache("cache_customers");
    return res;
  },

  reportPresence(user: { userId: string; employeeName: string; employeeCode: string; position: string; area: string; territory: string }) {
    return postSingle<{ success: boolean }>({ action: "reportPresence", ...user, timestamp: Date.now() });
  },

  getActiveUsers() {
    return post<PresenceResponse>({ action: "getActiveUsers" });
  },

  prefetchData() {
    this.getMasterData().catch(() => {});
    this.getCustomers().catch(() => {});
    this.getProducts().catch(() => {});
    this.getSubDBs().catch(() => {});
  },

  clearCache() {
    invalidateCache();
  },
};
