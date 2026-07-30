"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Camera, FileText, Loader2, Check, X, ShoppingCart, Package, MapPin } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { api, type CustomerListItem, type MasterData, type ProductItem, type SubDBItem } from "@/services/api";

function OrderContent() {
  useAuth();
  const emailRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [subDBs, setSubDBs] = useState<SubDBItem[]>([]);
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
  const [customerArea, setCustomerArea] = useState("");
  const [customerType, setCustomerType] = useState("");

  const [selectedSapId, setSelectedSapId] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [category, setCategory] = useState("");

  const [orderProducts, setOrderProducts] = useState<Array<{
    productId: string; productName: string; category: string; quantity: number; showDropdown?: boolean;
  }>>([{ productId: "", productName: "", category: "", quantity: 1, showDropdown: false }]);

  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState("");
  const [attachmentType, setAttachmentType] = useState<"jpg" | "pdf">("jpg");

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [masterRes, customerRes, productRes, subDBRes] = await Promise.all([
          api.getMasterData().catch(() => ({ success: false, data: undefined })),
          api.getCustomers().catch(() => ({ success: false, data: undefined })),
          api.getProducts().catch(() => ({ success: false, data: undefined })),
          api.getSubDBs().catch(() => ({ success: false, data: undefined })),
        ]);
        if (mounted) {
          if (masterRes.success && masterRes.data) setMasterData(masterRes.data);
          if (customerRes.success && customerRes.data) setCustomers(customerRes.data);
          if (productRes.success && productRes.data) setProducts(productRes.data);
          if (subDBRes.success && subDBRes.data) setSubDBs(subDBRes.data);
        }
      } catch { /* silent */ } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emailRef.current && !emailRef.current.contains(e.target as Node)) setShowEmailDropdown(false);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmails = useMemo(() => {
    const query = emailSearch.trim().toLowerCase();
    const list = masterData?.employees || [];
    if (!query) return list;
    return list.filter((e) => e.email.toLowerCase().includes(query) || e.employeeName.toLowerCase().includes(query) || (e.employeeCode && e.employeeCode.toLowerCase().includes(query)))
      .sort((a, b) => { const aS = a.employeeName.toLowerCase().startsWith(query) ? 0 : 1; const bS = b.employeeName.toLowerCase().startsWith(query) ? 0 : 1; return aS - bS; });
  }, [masterData, emailSearch]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    const list = customers.filter((c) => c.customerId.startsWith("22"));
    if (!query) return list;
    return list.filter((c) => c.customerId.toLowerCase().includes(query) || c.shopName.toLowerCase().includes(query) || (c.ownerContact && c.ownerContact.toLowerCase().includes(query)))
      .sort((a, b) => { const aS = a.shopName.toLowerCase().startsWith(query) ? 0 : 1; const bS = b.shopName.toLowerCase().startsWith(query) ? 0 : 1; return aS - bS; });
  }, [customers, customerSearch]);

  const selectEmail = (emp: { email: string; employeeName: string; employeeCode: string; territory: string }) => {
    setEmail(emp.email); setSalesOfficer(emp.employeeCode); setSalesPersonName(emp.employeeName); setEmpTerritory(emp.territory);
    setEmailSearch(`${emp.employeeName} (${emp.email})`); setShowEmailDropdown(false);
  };

  const selectCustomer = (c: CustomerListItem) => {
    setSelectedCustomerId(c.customerId); setCustomerName(c.shopName); setCustomerPhone(c.ownerContact); setCustomerArea(c.area); setCustomerType(c.shopType);
    setCustomerSearch(`${c.shopName} (${c.customerId})`); setShowCustomerDropdown(false);
  };

  const selectSubDB = (sub: SubDBItem) => {
    setSelectedSapId(sub.sapId); setSelectedZone(sub.zone); setSelectedArea(sub.area); setDistributorName(sub.subDbName); setCategory(sub.zone);
  };

  const addProductRow = () => setOrderProducts([...orderProducts, { productId: "", productName: "", category: "", quantity: 1, showDropdown: false }]);
  const removeProductRow = (index: number) => { if (orderProducts.length <= 1) return; setOrderProducts(orderProducts.filter((_, i) => i !== index)); };

  const updateProductRow = (index: number, field: string, value: string | number | boolean) => {
    setOrderProducts((prev) => { const updated = [...prev]; updated[index] = { ...updated[index], [field]: value }; return updated; });
  };

  const selectProduct = (index: number, product: ProductItem) => {
    setOrderProducts((prev) => { const updated = [...prev]; updated[index] = { productId: product.productId, productName: product.productName, category: product.category, quantity: updated[index].quantity, showDropdown: false }; return updated; });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const result = reader.result as string; setAttachmentPreview(result); setAttachmentBase64(result); setAttachmentType(file.type === "application/pdf" ? "pdf" : "jpg"); };
    reader.readAsDataURL(file);
  };

  const totalProducts = orderProducts.filter((p) => p.productId).length;
  const totalQuantity = orderProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const handleSubmit = async () => {
    if (!email) return alert("Please select a Sales Officer");
    if (!selectedCustomerId) return alert("Please select a Customer");
    const validProducts = orderProducts.filter((p) => p.productId);
    if (validProducts.length === 0) return alert("Please select at least one product");
    if (!attachmentBase64) return alert("Please attach a memo document");

    setSubmitting(true); setSubmitResult(null);
    try {
      const result = await api.submitOrder({
        email, dsr: salesOfficer, employeeName: salesPersonName, territory: empTerritory,
        customerId: selectedCustomerId, customerName, sapId: selectedSapId, zone: selectedZone,
        area: selectedArea || customerArea, distributorName, category, products: validProducts,
        attachmentBase64: attachmentBase64 || undefined, attachmentType,
      });
      if (result.success) {
        setSubmitResult({ success: true, message: result.message || "Order placed successfully!" });
        setOrderProducts([{ productId: "", productName: "", category: "", quantity: 1, showDropdown: false }]);
        setAttachmentPreview(""); setAttachmentBase64("");
      } else {
        setSubmitResult({ success: false, message: result.message || "Failed to place order." });
      }
    } catch {
      setSubmitResult({ success: false, message: "Network error. Please try again." });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="gradient-header text-white p-4 pb-6">
        <h1 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Place Order</h1>
        <p className="text-blue-200 text-xs">Create a new customer order</p>
      </div>

      <div className="-mt-3 px-4 space-y-4">
        {submitResult && (
          <div className={`p-3 rounded-xl flex items-center gap-2.5 card-shadow ${submitResult.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            {submitResult.success ? <Check className="w-5 h-5 text-emerald-600 shrink-0" /> : <X className="w-5 h-5 text-red-600 shrink-0" />}
            <span className={`text-sm font-medium ${submitResult.success ? "text-emerald-700" : "text-red-700"}`}>{submitResult.message}</span>
          </div>
        )}

        {/* Sales Info */}
        <Card className="card-shadow border-0 overflow-visible relative z-30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-100 p-1.5 rounded-lg"><Search className="w-4 h-4 text-blue-600" /></div>
              <CardTitle className="text-sm font-semibold">Sales Info</CardTitle>
            </div>
            <div className="relative z-50" ref={emailRef}>
              <Label className="text-xs text-gray-500 font-medium mb-1 block">Sales Officer *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search by name or email..." value={emailSearch}
                  onChange={(e) => { setEmailSearch(e.target.value); setShowEmailDropdown(true); if (email && e.target.value !== `${salesPersonName} (${email})`) { setEmail(""); setSalesOfficer(""); setSalesPersonName(""); setEmpTerritory(""); } }}
                  onFocus={() => setShowEmailDropdown(true)} className="pl-9 h-10 rounded-xl" />
                {emailSearch && <button onClick={() => { setEmail(""); setSalesOfficer(""); setSalesPersonName(""); setEmpTerritory(""); setEmailSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
              </div>
              {showEmailDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {filteredEmails.length === 0 ? <div className="p-3 text-xs text-gray-500 text-center">No sales officer found</div> :
                    filteredEmails.map((emp) => (
                      <button key={emp.email} type="button" className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0 transition-colors" onClick={() => selectEmail(emp)}>
                        <div className="font-semibold text-gray-900">{emp.employeeName}</div>
                        <div className="text-xs text-gray-500">Code: {emp.employeeCode || "N/A"} | {emp.email}</div>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            {email && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5"><span className="text-[10px] text-gray-500 font-medium">Name</span><p className="text-xs font-bold">{salesPersonName}</p></div>
                <div className="bg-gray-50 rounded-xl p-2.5"><span className="text-[10px] text-gray-500 font-medium">Code</span><p className="text-xs font-bold">{salesOfficer}</p></div>
                <div className="bg-gray-50 rounded-xl p-2.5 col-span-2"><span className="text-[10px] text-gray-500 font-medium">Territory</span><p className="text-xs font-bold">{empTerritory}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="card-shadow border-0 overflow-visible relative z-20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-emerald-100 p-1.5 rounded-lg"><MapPin className="w-4 h-4 text-emerald-600" /></div>
              <CardTitle className="text-sm font-semibold">Customer Info</CardTitle>
            </div>
            <div className="relative z-50" ref={customerRef}>
              <Label className="text-xs text-gray-500 font-medium mb-1 block">Customer *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search by code, name, or phone..." value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (selectedCustomerId && e.target.value !== `${customerName} (${selectedCustomerId})`) { setSelectedCustomerId(""); setCustomerName(""); setCustomerPhone(""); setCustomerArea(""); setCustomerType(""); } }}
                  onFocus={() => setShowCustomerDropdown(true)} className="pl-9 h-10 rounded-xl" />
                {customerSearch && <button onClick={() => { setSelectedCustomerId(""); setCustomerName(""); setCustomerPhone(""); setCustomerArea(""); setCustomerType(""); setCustomerSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
              </div>
              {showCustomerDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredCustomers.length === 0 ? <div className="p-3 text-xs text-gray-500 text-center">No customer found</div> :
                    filteredCustomers.slice(0, 20).map((c) => (
                      <button key={c.customerId} type="button" className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0 transition-colors" onClick={() => selectCustomer(c)}>
                        <div className="font-bold text-blue-600">{c.shopName}</div>
                        <div className="text-xs text-gray-500">Code: {c.customerId} | Phone: {c.ownerContact} | {c.area}</div>
                      </button>
                    ))
                  }
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
                  { label: "Type", value: customerType, span: true },
                ].map((item) => (
                  <div key={item.label} className={`bg-gray-50 rounded-xl p-2.5 ${item.span ? "col-span-2" : ""}`}>
                    <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                    <p className="text-xs font-bold">{item.value || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sub DB */}
        <Card className="card-shadow border-0 overflow-visible relative z-10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-amber-100 p-1.5 rounded-lg"><Package className="w-4 h-4 text-amber-600" /></div>
              <CardTitle className="text-sm font-semibold">Sub DB Info</CardTitle>
            </div>
            <Label className="text-xs text-gray-500 font-medium">Select Sub DB (optional)</Label>
            <Select value={selectedSapId} onValueChange={(val) => { const sub = subDBs.find((s) => s.sapId === val); if (sub) selectSubDB(sub); }}>
              <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Choose Sub DB..." /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto w-[var(--radix-select-trigger-width)] min-w-[300px]">
                {subDBs.map((sub) => (<SelectItem key={sub.sapId} value={sub.sapId} className="whitespace-normal">{sub.subDbName} ({sub.sapId}) - {sub.zone}</SelectItem>))}
              </SelectContent>
            </Select>
            {selectedSapId && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "SAP ID", value: selectedSapId },
                  { label: "Zone", value: selectedZone },
                  { label: "Area", value: selectedArea },
                  { label: "Distributor", value: distributorName },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                    <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                    <p className="text-xs font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="card-shadow border-0 overflow-visible relative z-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-violet-100 p-1.5 rounded-lg"><Package className="w-4 h-4 text-violet-600" /></div>
                <CardTitle className="text-sm font-semibold">Product Info</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={addProductRow} className="h-7 text-xs rounded-lg">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {orderProducts.map((item, idx) => {
              const filteredProds = products.filter((p) => !item.productName || p.productName.toLowerCase().includes(item.productName.toLowerCase()) || p.productId.toLowerCase().includes(item.productName.toLowerCase()));
              return (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2 relative" style={{ zIndex: 100 - idx }}>
                  {orderProducts.length > 1 && (
                    <button type="button" onClick={() => removeProductRow(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-2 rounded-full bg-transparent focus:outline-none">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Product {idx + 1}</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search product..." value={item.productName}
                      onChange={(e) => { updateProductRow(idx, "productName", e.target.value); updateProductRow(idx, "productId", ""); updateProductRow(idx, "showDropdown", true); }}
                      onFocus={() => updateProductRow(idx, "showDropdown", true)}
                      onBlur={() => { setTimeout(() => updateProductRow(idx, "showDropdown", false), 200); }}
                      className="pl-9 h-10 rounded-xl" />
                    {item.productName && <button onClick={() => { updateProductRow(idx, "productName", ""); updateProductRow(idx, "productId", ""); updateProductRow(idx, "category", ""); updateProductRow(idx, "showDropdown", true); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
                    {item.showDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                        {filteredProds.length === 0 ? <div className="p-3 text-xs text-gray-500 text-center">No product found</div> :
                          filteredProds.map((p) => (
                            <button key={p.productId} type="button" className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0 transition-colors" onClick={() => selectProduct(idx, p)}>
                              <div className="font-semibold text-gray-900">{p.productName}</div>
                              <div className="text-xs text-gray-500">{p.productId} | {p.category} | Pack: {p.packSize}</div>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  {item.productId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2"><span className="text-[10px] text-gray-500 font-medium">ID</span><p className="text-xs font-bold">{item.productId}</p></div>
                      <div className="bg-gray-50 rounded-lg p-2"><span className="text-[10px] text-gray-500 font-medium">Category</span><p className="text-xs font-bold">{item.category}</p></div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500 font-medium">Quantity *</Label>
                    <Input type="number" min="0" value={item.quantity} onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val <= 0) {
                        // Remove the row if quantity set to 0
                        removeProductRow(idx);
                      } else {
                        updateProductRow(idx, "quantity", val);
                      }
                    }} className="text-sm mt-1 h-9 rounded-xl" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
                <div className="text-xs text-gray-500 font-medium">Products</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-600">{totalQuantity}</div>
                <div className="text-xs text-gray-500 font-medium">Total Qty</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachment */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-pink-100 p-1.5 rounded-lg"><Camera className="w-4 h-4 text-pink-600" /></div>
              <CardTitle className="text-sm font-semibold">Memo Attachment *</CardTitle>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
            {!attachmentPreview ? (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all">
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">Take Photo or Upload File</span>
                <span className="text-xs text-gray-400">JPG or PDF</span>
              </button>
            ) : (
              <div className="relative">
                {attachmentType === "pdf" ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <FileText className="w-8 h-8 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">PDF Attached</span>
                  </div>
                ) : (
                  <img src={attachmentPreview} alt="Attachment" className="w-full h-40 object-cover rounded-xl" />
                )}
                <button type="button" onClick={() => { setAttachmentPreview(""); setAttachmentBase64(""); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-13 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Place Order"}
        </Button>
        <div className="h-4" />
      </div>
    </div>
  );
}

export default function OrderPage() {
  return <AuthGuard><OrderContent /></AuthGuard>;
}
