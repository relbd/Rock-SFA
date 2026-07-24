export interface User {
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
  activeStatus: "Active" | "Not Active";
  joiningDate: string;
  lastLogin: string;
  loginCount: number;
  profilePhotoUrl: string;
  remarks: string;
}

export interface Customer {
  customerCode: number;
  customerName: string;
  phone: string;
  city: string;
  area: string;
  customerType: string;
}

export interface Product {
  category: string;
  productId: string;
  productName: string;
  packSize: string;
  pricePerLiter: number;
  canPailDrum: number;
  cartoonPrice: number;
  status: "Active" | "Not Active";
}

export interface Territory {
  sn: number;
  territory: string;
  district: string;
  area: string;
  division: string;
  districtAndArea: string;
}

export interface SubDB {
  zone: string;
  sapId: string;
  area: string;
  subDbName: string;
  status: "Active" | "Not Active";
}
