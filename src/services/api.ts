const API_URL = "https://script.google.com/macros/s/AKfycbymFT8W68NLbVsYX-VaHFdzvC3VYAuHSrOE3czdG9cJiaOpqtVJP-P6CHDWd3PkEetM/exec";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
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

export const api = {
  login(email: string, password: string) {
    return post<LoginResponse>({ action: "login", email, password });
  },

  clockIn(userId: string, lat: number, lng: number, imageBase64?: string) {
    return post<AttendanceResponse>({ action: "clockIn", userId, lat, lng, imageBase64 });
  },

  clockOut(userId: string, lat: number, lng: number, imageBase64?: string) {
    return post<AttendanceResponse>({ action: "clockOut", userId, lat, lng, imageBase64 });
  },

  getMasterData() {
    return post<MasterDataResponse>({ action: "getMasterData" });
  },

  getCustomers() {
    return post<CustomerListResponse>({ action: "getCustomers" });
  },

  getProducts() {
    return post<ProductListResponse>({ action: "getProducts" });
  },

  getSubDBs() {
    return post<SubDBListResponse>({ action: "getSubDBs" });
  },

  submitVisit(data: VisitData) {
    return post<VisitResponse>({ action: "submitVisit", ...data });
  },

  submitOrder(data: OrderData) {
    return post<OrderResponse>({ action: "submitOrder", ...data });
  },

  getDashboardData(email: string) {
    return post<DashboardResponse>({ action: "getDashboardData", email });
  },

  getReportData(email: string, startDate?: string, endDate?: string) {
    return post<ReportResponse>({ action: "getReportData", email, startDate, endDate });
  },

  registerCustomer(data: {
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
    return post<CustomerRegistrationResponse>({ action: "registerCustomer", ...data });
  },
};
