"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Search, Check, X, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { api, type CustomerListItem, type MasterData } from "@/services/api";

const BRAND_OPTIONS = [
  "Castrol", "Mobil", "Shell", "Total", "BP", "Caltex",
  "Gulf", "ENOC", "ADNOC", "Motul", "LIQUI MOLY", "Petronas", "Other",
];

const ORDER_NOT_RECEIVED_OPTIONS = [
  "Order Received",
  "Sufficient Castrol Products on Shop",
  "Customer Buying Castrol from Others Shop",
  "Need Product Supply",
  "Need Dealer Visit",
  "Need Credit Support",
  "Shop Closed",
  "Owner Not Available",
  "Competitor Promotion",
  "Price Issue",
  "Stock Out",
  "Others",
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ className?: string }>; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`bg-${color}-100 p-1.5 rounded-lg`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
    </div>
  );
}

function VisitContent() {
  useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [emailSearch, setEmailSearch] = useState("");
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [email, setEmail] = useState("");
  const [salesOfficer, setSalesOfficer] = useState("");
  const [salesPersonName, setSalesPersonName] = useState("");
  const [empTerritory, setEmpTerritory] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDistrict, setCustomerDistrict] = useState("");
  const [customerArea, setCustomerArea] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [marketName, setMarketName] = useState("");
  const [storeLat, setStoreLat] = useState("");
  const [storeLng, setStoreLng] = useState("");

  const [totalQuantity, setTotalQuantity] = useState("");
  const [orderDeliveryDate, setOrderDeliveryDate] = useState("");
  const [orderNotReceived, setOrderNotReceived] = useState("");
  const [otherDetails, setOtherDetails] = useState("");

  const [brandFocus, setBrandFocus] = useState<string[]>([]);
  const [otherBrand, setOtherBrand] = useState("");
  const [castrolInventory, setCastrolInventory] = useState("");
  const [comments, setComments] = useState("");

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");

  const [selfieBase64, setSelfieBase64] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const submitGuardRef = useRef(false);

  const filteredEmployees = masterData
    ? masterData.employees.filter(function (e) {
        const s = emailSearch.toLowerCase();
        return e.email.toLowerCase().includes(s) || e.employeeName.toLowerCase().includes(s);
      }).sort(function (a, b) {
        const s = emailSearch.toLowerCase();
        const aName = a.employeeName.toLowerCase();
        const bName = b.employeeName.toLowerCase();
        const aStarts = aName.startsWith(s) || a.email.toLowerCase().startsWith(s) ? 0 : 1;
        const bStarts = bName.startsWith(s) || b.email.toLowerCase().startsWith(s) ? 0 : 1;
        return aStarts - bStarts;
      })
    : [];

  const filteredCustomers = customerSearch
    ? customers.filter(function (c) {
        const sq = customerSearch.toLowerCase();
        return String(c.customerId).toLowerCase().includes(sq)
          || String(c.shopName).toLowerCase().includes(sq)
          || String(c.ownerContact).includes(sq);
      }).sort(function (a, b) {
        const sq = customerSearch.toLowerCase();
        const aId = String(a.customerId).toLowerCase();
        const bId = String(b.customerId).toLowerCase();
        const aName = String(a.shopName).toLowerCase();
        const bName = String(b.shopName).toLowerCase();
        const aPhone = String(a.ownerContact);
        const bPhone = String(b.ownerContact);
        const aExact = (aId.startsWith(sq) || aName.startsWith(sq) || aPhone.startsWith(sq)) ? 0 : 1;
        const bExact = (bId.startsWith(sq) || bName.startsWith(sq) || bPhone.startsWith(sq)) ? 0 : 1;
        return aExact - bExact;
      })
    : [];

  useEffect(function () {
    Promise.all([api.getMasterData(), api.getCustomers()])
      .then(function ([master, cust]) {
        if (master.success && master.data) setMasterData(master.data);
        if (cust.success && cust.data) setCustomers(cust.data);
      })
      .catch(function () { setMessage("Failed to load data"); setMessageType("error"); })
      .finally(function () { setLoading(false); });
  }, []);

  useEffect(function () {
    function handleClick(e: MouseEvent) {
      if (emailRef.current && !emailRef.current.contains(e.target as Node)) setShowEmailDropdown(false);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return function () { document.removeEventListener("mousedown", handleClick); };
  }, []);

  function handleEmailSelect(selectedEmail: string) {
    setEmail(selectedEmail);
    setEmailSearch(selectedEmail);
    setShowEmailDropdown(false);
    if (masterData) {
      const emp = masterData.employees.find(function (e) { return e.email === selectedEmail; });
      setSalesOfficer(emp ? emp.employeeCode : "");
      setSalesPersonName(emp ? emp.employeeName : "");
      setEmpTerritory(emp ? emp.territory : "");
    }
  }

  function handleCustomerSelect(c: CustomerListItem) {
    setSelectedCustomerId(c.customerId);
    setCustomerSearch(c.shopName + " - " + c.customerId);
    setShowCustomerDropdown(false);
    setCustomerName(c.shopName);
    setCustomerPhone(c.ownerContact);
    setCustomerDistrict(c.district);
    setCustomerArea(c.area);
    setCustomerType(c.shopType);
    setMarketName(c.marketName);
    setStoreLat(c.latitude);
    setStoreLng(c.longitude);
  }

  function getLocation() {
    if (!navigator.geolocation) { setGpsMessage("GPS not available"); return; }
    setGettingGps(true);
    setGpsMessage("");
    let bestLat = 0;
    let bestLng = 0;
    let bestAcc = Infinity;
    let attempts = 0;
    const maxAttempts = 5;

    function tryGetLocation() {
      attempts++;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const acc = pos.coords.accuracy;
          if (acc < bestAcc) {
            bestAcc = acc;
            bestLat = pos.coords.latitude;
            bestLng = pos.coords.longitude;
          }
          if (acc <= 10 || attempts >= maxAttempts) {
            setGpsLat(bestLat.toFixed(8));
            setGpsLng(bestLng.toFixed(8));
            setGpsAccuracy(bestAcc.toFixed(0));
            const pct = Math.max(0, Math.round(100 - bestAcc));
            setGpsMessage("Location captured (" + pct + "% accuracy)");
            if (storeLat && storeLng) {
              const d = haversineDistance(bestLat, bestLng, Number(storeLat), Number(storeLng));
              setDistance(Math.round(d));
            }
            setGettingGps(false);
          } else {
            setTimeout(tryGetLocation, 1000);
          }
        },
        function () {
          if (bestAcc < Infinity) {
            setGpsLat(bestLat.toFixed(8));
            setGpsLng(bestLng.toFixed(8));
            setGpsAccuracy(bestAcc.toFixed(0));
            const pct = Math.max(0, Math.round(100 - bestAcc));
            setGpsMessage("Location captured (" + pct + "% accuracy)");
            if (storeLat && storeLng) {
              const d = haversineDistance(bestLat, bestLng, Number(storeLat), Number(storeLng));
              setDistance(Math.round(d));
            }
          } else {
            setGpsMessage("GPS permission denied");
          }
          setGettingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
    tryGetLocation();
  }

  function handleSelfieCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const maxW = 800;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      setSelfiePreview(compressed);
      setSelfieBase64(compressed);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function toggleBrand(brand: string) {
    setBrandFocus(function (prev) {
      if (prev.includes(brand)) return prev.filter(function (b) { return b !== brand; });
      return [...prev, brand];
    });
  }

  function validate(): string | null {
    if (!email) return "Email is required";
    if (!selectedCustomerId) return "Customer is required";
    if (totalQuantity === "" || totalQuantity === null || totalQuantity === undefined) return "Total Quantity is required";
    if (brandFocus.length === 0) return "Brand Focus is required";
    if (!gpsLat || !gpsLng) return "GPS Location is required";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setMessage(err); setMessageType("error"); return; }
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setSubmitting(true);
    setMessage("");
    try {
      const res = await api.submitVisit({
        email, salesOfficer, salesPersonName, territory: empTerritory,
        customerId: selectedCustomerId, customerName, customerPhone,
        district: customerDistrict, area: customerArea, customerType, marketName,
        totalQuantity: Number(totalQuantity),
        orderDeliveryDate: orderDeliveryDate || undefined,
        orderNotReceived: orderNotReceived || undefined,
        otherDetails: orderNotReceived === "Others" ? otherDetails : undefined,
        brandFocus: brandFocus.join(", "),
        otherBrand: brandFocus.includes("Other") ? otherBrand : undefined,
        castrolInventory: castrolInventory || undefined,
        comments: comments || undefined,
        lat: gpsLat ? Number(gpsLat) : undefined,
        lng: gpsLng ? Number(gpsLng) : undefined,
        gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
        storeLat: storeLat || undefined,
        storeLng: storeLng || undefined,
        distance: distance ?? undefined,
        visitResult: distance !== null ? (distance <= 100 ? "Inside Radius" : "Outside Radius") : undefined,
        visitStatus: "Completed",
        selfieBase64: selfieBase64 || undefined,
      });
      if (res.success) {
        setMessageType("success");
        setMessage("Visit " + res.visitId + " recorded successfully!");
        setEmail(""); setEmailSearch(""); setSalesOfficer(""); setSalesPersonName(""); setEmpTerritory("");
        setSelectedCustomerId(""); setCustomerSearch(""); setCustomerName(""); setCustomerPhone("");
        setCustomerDistrict(""); setCustomerArea(""); setCustomerType(""); setMarketName("");
        setStoreLat(""); setStoreLng("");
        setTotalQuantity(""); setOrderDeliveryDate(""); setOrderNotReceived(""); setOtherDetails("");
        setBrandFocus([]); setOtherBrand(""); setCastrolInventory(""); setComments("");
        setGpsLat(""); setGpsLng(""); setGpsAccuracy(""); setDistance(null); setGpsMessage("");
        setSelfieBase64(""); setSelfiePreview("");
      } else {
        setMessageType("error");
        setMessage(res.message || "Submission failed");
      }
    } catch {
      setMessageType("error");
      setMessage("Unable to connect. Try again.");
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="gradient-header text-white p-4 pb-6">
        <h1 className="text-lg font-bold">Customer Visit</h1>
        <p className="text-blue-200 text-xs">Record a new customer visit</p>
      </div>

      <div className="-mt-3 px-4 space-y-4">
        {message && (
          <div className={`p-3 rounded-xl flex items-center gap-2 card-shadow ${messageType === "success" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            {messageType === "success" ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-red-600 shrink-0" />}
            <span className={`text-sm font-medium ${messageType === "success" ? "text-emerald-700" : "text-red-700"}`}>{message}</span>
          </div>
        )}

        {/* Sales Officer */}
        <Card className="card-shadow border-0 overflow-visible relative z-30">
          <CardContent className="p-4 space-y-3">
            <SectionHeader icon={Search} title="Sales Officer Information" color="blue" />
            <div className="relative" ref={emailRef}>
              <Label className="text-xs text-gray-500 font-medium mb-1 block">Email <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search email..." className="pl-9 h-10 rounded-xl" value={emailSearch}
                  onChange={function (e) { setEmailSearch(e.target.value); setShowEmailDropdown(true); if (e.target.value !== email) { setEmail(""); setSalesOfficer(""); setSalesPersonName(""); setEmpTerritory(""); } }}
                  onFocus={function () { setShowEmailDropdown(true); }} />
              </div>
              {showEmailDropdown && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredEmployees.length === 0 && <p className="p-3 text-sm text-gray-500">No matches</p>}
                  {filteredEmployees.map(function (emp) {
                    return (
                      <button key={emp.email} type="button" className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                        onClick={function () { handleEmailSelect(emp.email); }}>
                        <span className="font-semibold text-gray-900">{emp.employeeName}</span>
                        <span className="text-gray-500 ml-2 text-xs">{emp.email}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {email && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5"><span className="text-[10px] text-gray-500 font-medium">Code</span><p className="text-xs font-bold">{salesOfficer}</p></div>
                <div className="bg-gray-50 rounded-xl p-2.5"><span className="text-[10px] text-gray-500 font-medium">Territory</span><p className="text-xs font-bold">{empTerritory}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="card-shadow border-0 overflow-visible relative z-20">
          <CardContent className="p-4 space-y-3">
            <SectionHeader icon={MapPin} title="Customer Information" color="emerald" />
            <div className="relative" ref={customerRef}>
              <Label className="text-xs text-gray-500 font-medium mb-1 block">Search Customer <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search by Code, Name, Phone..." className="pl-9 h-10 rounded-xl" value={customerSearch} autoComplete="off"
                  onChange={function (e) { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={function (e) { setShowCustomerDropdown(true); e.target.select(); }}
                  onBlur={function () { setTimeout(function () { setShowCustomerDropdown(false); }, 150); }} />
              </div>
              {showCustomerDropdown && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  {filteredCustomers.length === 0 && <p className="p-3 text-sm text-gray-500">No matches</p>}
                  {filteredCustomers.slice(0, 100).map(function (c) {
                    return (
                      <button key={c.customerId} type="button" className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                        onClick={function () { handleCustomerSelect(c); }}>
                        <span className="font-bold text-blue-600">{c.customerId}</span>
                        <span className="text-gray-700 font-medium ml-2">{c.shopName}</span>
                        <br />
                        <span className="text-gray-400 text-xs">{c.ownerContact} | {c.area}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedCustomerId && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Code", value: selectedCustomerId },
                  { label: "Name", value: customerName },
                  { label: "Phone", value: customerPhone },
                  { label: "Area", value: customerArea },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                    <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                    <p className="text-xs font-bold">{item.value || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit Info */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <SectionHeader icon={MapPin} title="Visit Information" color="amber" />
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Total Quantity (Ltr) <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="e.g. 250" value={totalQuantity} onChange={function (e) { setTotalQuantity(e.target.value); }} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Order Delivery Date</Label>
              <Input type="date" value={orderDeliveryDate} onChange={function (e) { setOrderDeliveryDate(e.target.value); }} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Order Not Received Details</Label>
              <Select value={orderNotReceived} onValueChange={function (v) { setOrderNotReceived(v ?? ""); }}>
                <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ORDER_NOT_RECEIVED_OPTIONS.map(function (o) {
                    return <SelectItem key={o} value={o}>{o}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {orderNotReceived === "Others" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Other Details</Label>
                <textarea className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="Describe details..." value={otherDetails} onChange={function (e) { setOtherDetails(e.target.value); }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Info */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <SectionHeader icon={Check} title="Brand Information" color="violet" />
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Brand Focus <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {BRAND_OPTIONS.map(function (brand) {
                  const selected = brandFocus.includes(brand);
                  return (
                    <button key={brand} type="button"
                      className={"flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all " + (selected ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold" : "border-gray-200 hover:border-gray-300 text-gray-600")}
                      onClick={function () { toggleBrand(brand); }}>
                      <div className={"w-4 h-4 rounded-md border flex items-center justify-center shrink-0 " + (selected ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs">{brand}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {brandFocus.includes("Other") && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Other Brand</Label>
                <Input placeholder="Enter brand name" value={otherBrand} onChange={function (e) { setOtherBrand(e.target.value); }} className="h-10 rounded-xl" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Castrol Inventory</Label>
              <textarea className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="e.g. 16 Ltr, 220 Ltr, 2 Drum, 10 Bucket" value={castrolInventory} onChange={function (e) { setCastrolInventory(e.target.value); }} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">Comments</Label>
              <textarea className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Any additional notes" value={comments} onChange={function (e) { setComments(e.target.value); }} />
            </div>
          </CardContent>
        </Card>

        {/* GPS */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <SectionHeader icon={MapPin} title="Location" color="blue" />
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 font-medium">GPS Location <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Input readOnly placeholder={gpsLat && gpsLng ? gpsLat + ", " + gpsLng : "Not captured yet"} className="bg-gray-50 h-10 rounded-xl flex-1 font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={getLocation} disabled={gettingGps} className="h-10 w-10 rounded-xl shrink-0">
                  {gettingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                </Button>
              </div>
              {gpsLat && gpsLng && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-[10px] text-gray-400">LATITUDE</p><p className="text-xs font-mono font-bold text-gray-800">{gpsLat}</p></div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-[10px] text-gray-400">LONGITUDE</p><p className="text-xs font-mono font-bold text-gray-800">{gpsLng}</p></div>
                </div>
              )}
              {gpsMessage && <p className={"text-xs font-medium " + (gpsLat ? "text-emerald-600" : "text-red-500")}>{gpsMessage}</p>}
              {gpsAccuracy && <p className="text-xs text-gray-400">Accuracy: {gpsAccuracy}m</p>}
            </div>
            {distance !== null && (
              <div className={"p-3 rounded-xl text-sm font-semibold border " + (distance <= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                <p>Distance from store: <strong>{distance}m</strong></p>
                <p className="text-xs mt-0.5">{distance <= 100 ? "Inside Radius" : "Outside Radius"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selfie */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4">
            <SectionHeader icon={Camera} title="Selfie (Optional)" color="pink" />
            <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieCapture} />
            {selfiePreview ? (
              <div className="relative mt-2">
                <img src={selfiePreview} alt="Selfie preview" className="w-full h-48 object-cover rounded-xl" />
                <button type="button" className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg"
                  onClick={function () { setSelfiePreview(""); setSelfieBase64(""); }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mt-2"
                onClick={function () { fileInputRef.current?.click(); }}>
                <div className="p-3 bg-gray-100 rounded-full"><Camera className="w-6 h-6 text-gray-400" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Capture Selfie</p>
                  <p className="text-xs text-gray-400">Optional but recommended</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-1 rounded-xl">Open Camera</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button className="w-full h-13 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg" type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : "Submit Visit"}
        </Button>

        <div className="h-4" />
      </div>
    </div>
  );
}

export default function Visit() {
  return <AuthGuard><VisitContent /></AuthGuard>;
}
