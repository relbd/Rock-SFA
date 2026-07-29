"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Check, X, Loader2, Search, UserPlus, Store, Tag, Map, Image } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { api, type MasterData } from "@/services/api";

const OIL_BRANDS = ["Castrol", "Mobil", "Shell", "Total", "BP", "Caltex", "Gulf", "ENOC", "ADNOC", "Motul", "LIQUI MOLY", "Other"];
const SHOP_TYPES = ["Retail", "Wholesale", "IWS MCO", "IWS PCO", "IWS CVO", "Filling Station"];

function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ className?: string }>; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`bg-${color}-100 p-1.5 rounded-lg`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function CustomerRegistrationContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [emailSearch, setEmailSearch] = useState("");
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [salesOfficer, setSalesOfficer] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [territory, setTerritory] = useState("");
  const [marketName, setMarketName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [nid, setNid] = useState("");
  const [etin, setEtin] = useState("");
  const [bin, setBin] = useState("");
  const [oilBrands, setOilBrands] = useState<string[]>([]);
  const [otherBrand, setOtherBrand] = useState("");
  const [totalAvgVolume, setTotalAvgVolume] = useState("");
  const [avgCastrolVolume, setAvgCastrolVolume] = useState("");
  const [comment, setComment] = useState("");

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState("");
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");

  const [photoBase64, setPhotoBase64] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const submitGuardRef = useRef(false);

  const filteredAreas = masterData ? masterData.areas.filter((a) => a.district === district) : [];
  const filteredEmployees = masterData
    ? masterData.employees.filter((e) => { const s = emailSearch.toLowerCase(); return e.email.toLowerCase().includes(s) || e.employeeName.toLowerCase().includes(s); })
        .sort((a, b) => { const s = emailSearch.toLowerCase(); const aS = a.employeeName.toLowerCase().startsWith(s) || a.email.toLowerCase().startsWith(s) ? 0 : 1; const bS = b.employeeName.toLowerCase().startsWith(s) || b.email.toLowerCase().startsWith(s) ? 0 : 1; return aS - bS; })
    : [];

  useEffect(() => {
    api.getMasterData().then((res) => { if (res.success && res.data) setMasterData(res.data); })
      .catch(() => { setMessage("Failed to load master data"); setMessageType("error"); })
      .finally(() => { setLoadingMaster(false); });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (emailRef.current && !emailRef.current.contains(e.target as Node)) setShowEmailDropdown(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleEmailSelect(selectedEmail: string) {
    setEmail(selectedEmail); setEmailSearch(selectedEmail); setShowEmailDropdown(false);
    if (masterData) { const emp = masterData.employees.find((e) => e.email === selectedEmail); setSalesOfficer(emp ? emp.employeeName : ""); }
  }

  function handleAreaChange(val: string) {
    setArea(val);
    if (masterData) { const t = masterData.territories.find((t) => t.area === val); setTerritory(t ? t.territory : ""); }
  }

  function getLocation() {
    if (!navigator.geolocation) { setGpsMessage("GPS not available"); return; }
    setGettingGps(true); setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsLat(pos.coords.latitude.toFixed(6)); setGpsLng(pos.coords.longitude.toFixed(6)); setGpsAccuracy(pos.coords.accuracy.toFixed(0)); setGpsMessage("Location captured"); setGettingGps(false); },
      () => { setGpsMessage("GPS permission denied or failed"); setGettingGps(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string; setPhotoPreview(result);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas"); const maxW = 800;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoBase64(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  function toggleBrand(brand: string) { setOilBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]); }

  function validate(): string | null {
    if (!email) return "Email Address is required";
    if (!district) return "District is required";
    if (!area) return "Area is required";
    if (!marketName.trim()) return "Market Name is required";
    if (!shopName.trim()) return "Shop Name is required";
    if (!shopType) return "Shop Type is required";
    if (!fullAddress.trim()) return "Full Address is required";
    if (!ownerName.trim()) return "Owner Name is required";
    if (!ownerContact.trim()) return "Owner Contact Number is required";
    if (!/^\d{11}$/.test(ownerContact.trim())) return "Owner Contact must be 11 digits";
    if (oilBrands.length === 0) return "Oil Brand Selling is required";
    if (!totalAvgVolume || Number(totalAvgVolume) <= 0) return "Total Average Volume is required";
    if (!gpsLat || !gpsLng) return "GPS Location is required";
    return null;
  }

  async function handleSubmit() {
    const err = validate(); if (err) { setMessage(err); setMessageType("error"); return; }
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setSubmitting(true); setMessage("");
    try {
      const res = await api.registerCustomer({
        email, district, area, marketName: marketName.trim(), shopName: shopName.trim(), shopType,
        fullAddress: fullAddress.trim(), ownerName: ownerName.trim(), ownerContact: ownerContact.trim(),
        oilBrandSelling: oilBrands.join(", "), otherBrand, totalAvgVolume: Number(totalAvgVolume),
        avgCastrolVolume: avgCastrolVolume ? Number(avgCastrolVolume) : undefined,
        nid: nid || undefined, etin: etin || undefined, bin: bin || undefined, comment: comment || undefined,
        lat: gpsLat ? Number(gpsLat) : undefined, lng: gpsLng ? Number(gpsLng) : undefined,
        gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined, shopPhotoBase64: photoBase64 || undefined,
      });
      if (res.success) {
        setMessageType("success"); setMessage("Customer " + res.customerId + " registered successfully!");
        setEmail(""); setEmailSearch(""); setSalesOfficer(""); setDistrict(""); setArea(""); setTerritory("");
        setMarketName(""); setShopName(""); setShopType(""); setFullAddress(""); setOwnerName(""); setOwnerContact("");
        setNid(""); setEtin(""); setBin(""); setOilBrands([]); setOtherBrand("");
        setTotalAvgVolume(""); setAvgCastrolVolume(""); setComment("");
        setGpsLat(""); setGpsLng(""); setGpsAccuracy(""); setGpsMessage("");
        setPhotoBase64(""); setPhotoPreview("");
      } else { setMessageType("error"); setMessage(res.message || "Registration failed"); }
    } catch { setMessageType("error"); setMessage("Unable to connect. Try again."); }
    finally { setSubmitting(false); submitGuardRef.current = false; }
  }

  if (loadingMaster) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="gradient-header text-white p-4 pb-6">
        <h1 className="text-lg font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> New Customer</h1>
        <p className="text-blue-200 text-xs">Register a new shop/customer</p>
      </div>

      <div className="-mt-3 px-4 space-y-4">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Customer Info */}
          <Card className="card-shadow border-0 overflow-visible relative z-30">
            <CardContent className="p-4 space-y-3">
              <SectionHeader icon={Store} title="Customer Information" color="blue" />
              <div className="space-y-2 relative" ref={emailRef}>
                <Label className="text-xs text-gray-500 font-medium">Email Address <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search email..." className="pl-9 h-10 rounded-xl" value={emailSearch}
                    onChange={(e) => { setEmailSearch(e.target.value); setShowEmailDropdown(true); if (e.target.value !== email) { setEmail(""); setSalesOfficer(""); } }}
                    onFocus={() => setShowEmailDropdown(true)} />
                </div>
                {showEmailDropdown && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredEmployees.length === 0 && <p className="p-3 text-sm text-gray-500">No matches</p>}
                    {filteredEmployees.map((emp) => (
                      <button key={emp.email} type="button" className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors" onClick={() => handleEmailSelect(emp.email)}>
                        <span className="font-semibold">{emp.employeeName}</span>
                        <span className="text-gray-500 ml-2 text-xs">- {emp.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Sales Officer</Label>
                <Input value={salesOfficer} readOnly className="bg-gray-50 h-10 rounded-xl" placeholder="Auto-populated" />
              </div>
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card className="card-shadow border-0">
            <CardContent className="p-4 space-y-3">
              <SectionHeader icon={Store} title="Business Information" color="emerald" />
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">District <span className="text-red-500">*</span></Label>
                <Select value={district} onValueChange={(v) => { setDistrict(v ?? ""); setArea(""); setTerritory(""); }}>
                  <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Select District" /></SelectTrigger>
                  <SelectContent>{(masterData?.districts || []).map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Area <span className="text-red-500">*</span></Label>
                <Select value={area} onValueChange={(v) => handleAreaChange(v ?? "")} disabled={!district}>
                  <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder={district ? "Select Area" : "Select District first"} /></SelectTrigger>
                  <SelectContent>{filteredAreas.map((a) => (<SelectItem key={a.area} value={a.area}>{a.area}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Territory</Label><Input value={territory} readOnly className="bg-gray-50 h-10 rounded-xl" placeholder="Auto-populated" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Market Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Kazipara Market" value={marketName} onChange={(e) => setMarketName(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Shop Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Rahman Enterprise" value={shopName} onChange={(e) => setShopName(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Shop Type <span className="text-red-500">*</span></Label>
                <Select value={shopType} onValueChange={(v) => setShopType(v ?? "")}>
                  <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Select Shop Type" /></SelectTrigger>
                  <SelectContent>{SHOP_TYPES.map((st) => (<SelectItem key={st} value={st}>{st}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Full Address <span className="text-red-500">*</span></Label>
                <textarea className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="House 25, Road 03, Kazipara, Mirpur, Dhaka" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
              </div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Owner Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Abdul Rahman" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Owner Contact <span className="text-red-500">*</span></Label><Input type="tel" placeholder="01712345678" maxLength={11} value={ownerContact} onChange={(e) => setOwnerContact(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">NID <span className="text-gray-400">(Optional)</span></Label><Input placeholder="Numbers only" value={nid} onChange={(e) => setNid(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">E-TIN <span className="text-gray-400">(Optional)</span></Label><Input placeholder="E-TIN number" value={etin} onChange={(e) => setEtin(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">BIN <span className="text-gray-400">(Optional)</span></Label><Input placeholder="BIN number" value={bin} onChange={(e) => setBin(e.target.value)} className="h-10 rounded-xl" /></div>
            </CardContent>
          </Card>

          {/* Brands */}
          <Card className="card-shadow border-0">
            <CardContent className="p-4 space-y-3">
              <SectionHeader icon={Tag} title="Brand Information" color="violet" />
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">Oil Brand Selling <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {OIL_BRANDS.map((brand) => {
                    const selected = oilBrands.includes(brand);
                    return (
                      <button key={brand} type="button"
                        className={"flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all " + (selected ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold" : "border-gray-200 hover:border-gray-300 text-gray-600")}
                        onClick={() => toggleBrand(brand)}>
                        <div className={"w-4 h-4 rounded-md border flex items-center justify-center shrink-0 " + (selected ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs">{brand}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {oilBrands.includes("Other") && <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Specify Other Brand</Label><Input placeholder="Enter brand name" value={otherBrand} onChange={(e) => setOtherBrand(e.target.value)} className="h-10 rounded-xl" /></div>}
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Total Avg Volume (Ltr) <span className="text-red-500">*</span></Label><Input type="number" placeholder="e.g. 450" value={totalAvgVolume} onChange={(e) => setTotalAvgVolume(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Avg Castrol Volume (Ltr)</Label><Input type="number" placeholder="e.g. 180" value={avgCastrolVolume} onChange={(e) => setAvgCastrolVolume(e.target.value)} className="h-10 rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs text-gray-500 font-medium">Comment</Label><textarea className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Any additional notes" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* GPS */}
          <Card className="card-shadow border-0">
            <CardContent className="p-4 space-y-3">
              <SectionHeader icon={Map} title="Location" color="blue" />
              <Label className="text-xs text-gray-500 font-medium">GPS Location <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Input readOnly placeholder={gpsLat && gpsLng ? gpsLat + ", " + gpsLng : "Not captured yet"} className="bg-gray-50 h-10 rounded-xl flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={getLocation} disabled={gettingGps} className="h-10 w-10 rounded-xl shrink-0">
                  {gettingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                </Button>
              </div>
              {gpsMessage && <p className={"text-xs font-medium " + (gpsLat ? "text-emerald-600" : "text-red-500")}>{gpsMessage}</p>}
              {gpsAccuracy && <p className="text-xs text-gray-400">Accuracy: {gpsAccuracy}m</p>}
            </CardContent>
          </Card>

          {/* Photo */}
          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <SectionHeader icon={Image} title="Shop Photo" color="pink" />
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
              {photoPreview ? (
                <div className="relative mt-2">
                  <img src={photoPreview} alt="Shop preview" className="w-full h-48 object-cover rounded-xl" />
                  <button type="button" className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg" onClick={() => { setPhotoPreview(""); setPhotoBase64(""); }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mt-2"
                  onClick={() => fileInputRef.current?.click()}>
                  <div className="p-3 bg-gray-100 rounded-full"><Camera className="w-6 h-6 text-gray-400" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Capture Shop Photo</p>
                    <p className="text-xs text-gray-400">Must include shop signboard</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-1 rounded-xl">Open Camera</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {message && (
            <div className={`p-3 rounded-xl text-sm font-medium card-shadow ${messageType === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {message}
            </div>
          )}

          <Button className="w-full h-13 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg" type="submit" disabled={submitting}>
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Registering...</> : "Register Customer"}
          </Button>
          <div className="h-4" />
        </form>
      </div>
    </div>
  );
}

export default function CustomerRegistration() {
  return <AuthGuard><CustomerRegistrationContent /></AuthGuard>;
}
