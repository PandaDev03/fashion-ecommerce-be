export interface VariantAttributes {
  name: string;
  value: string;
}

export class OrderItemResponseDto {
  id: string;
  productId: string;
  productVariantId?: string;
  productName: string;
  // variantAttributes?: Record<string, string>;
  variantAttributes?: VariantAttributes[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export class OrderResponseDto {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  note?: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItemResponseDto[];
  createdAt: Date;
}
