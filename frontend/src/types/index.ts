export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ENTREPRENEUR';
  company?: string;
}

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type OrderStatus = 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REPORTED' | 'APPROVED' | 'SENT_TO_CLIENT' | 'COMPLETED';

export interface ReportMaterial {
  name: string;
  quantity: number;
  price: number;
}

export interface Report {
  id: string;
  orderId: string;
  actionTaken: string;
  hoursWorked: number;
  materials: ReportMaterial[];
  images: string[];
  invoiceUrl?: string | null;
  totalAmount: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  address: string;
  priority: Priority;
  status: OrderStatus;
  originalEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  deadline?: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  report?: Report | null;
}

