import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { OrderResponseDto } from '../order/dto/order-response.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetPasswordEmail(email: string, resetUrl: string): Promise<void> {
    const context = {
      logoUrl: this.configService.getOrThrow<string>('LOGO_URL'),
      resetUrl,
    };

    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      template: 'reset-password',
      context,
    });
  }

  async sendOrderConfirmation(order: OrderResponseDto) {
    const context = {
      logoUrl: this.configService.getOrThrow<string>('LOGO_URL'),
      customerName: order.customerName,
      customerCountry: 'Việt Nam',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleString('vi-VN'),
      status: 'Đang chờ xử lý',
      paymentMethod:
        order.paymentMethod === 'cod'
          ? 'Thanh toán khi nhận hàng (COD)'
          : order.paymentMethod,
      shippingMethod: 'Vận chuyển tiêu chuẩn',
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerEmail: order.customerEmail,
      note: order.note,
      items: order.items.map((item) => ({
        ...item,
        productVariantId: item?.productVariantId ?? '-',
        unitPriceFormatted: item.unitPrice.toLocaleString('vi-VN'),
        totalPriceFormatted: item.totalPrice.toLocaleString('vi-VN'),
        variantText:
          item.variantAttributes && item.variantAttributes.length > 0
            ? item.variantAttributes
                .map((attr) => `${attr.name}: ${attr.value}`)
                .join(', ')
            : null,
      })),
      subtotalFormatted: order.subtotal.toLocaleString('vi-VN'),
      shippingFeeFormatted: order.shippingFee.toLocaleString('vi-VN'),
      totalFormatted: order.total.toLocaleString('vi-VN'),
      currentYear: new Date().getFullYear(),
      viewOrderUrl: `${this.configService.get('FRONTEND_URL')}/order/${order.orderNumber}`,
    };

    await this.mailerService.sendMail({
      to: order.customerEmail,
      subject: `Xác nhận đơn hàng #${order.orderNumber}`,
      template: 'order-confirmation',
      context,
    });
  }

  async sendOrderStatusUpdate(
    order: OrderResponseDto,
    newStatus: string,
    cancellationReason?: string,
  ) {
    const statusMap = {
      confirmed: {
        text: 'Đã xác nhận',
        message: 'Đơn hàng của bạn đã được xác nhận và đang chuẩn bị hàng.',
        icon: 'https://res.cloudinary.com/dis180ycw/image/upload/v1766999003/fashion-ecommerce/mailer-images/express-delivery_zsprae.png',
      },
      shipping: {
        text: 'Đang giao hàng',
        message: 'Đơn hàng của bạn đang trên đường giao đến bạn.',
        icon: '',
      },
      delivered: {
        text: 'Đã giao hàng',
        message: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua hàng!',
        icon: '',
      },
      cancelled: {
        text: 'Đã hủy',
        message: `Đơn hàng của bạn đã bị hủy.${cancellationReason ? ` Lý do: ${cancellationReason}` : ''}`,
        icon: 'https://res.cloudinary.com/dis180ycw/image/upload/v1767000512/fashion-ecommerce/mailer-images/cancel-order_cpfba1.png',
      },
    };

    const statusInfo = statusMap[newStatus] || {
      text: newStatus,
      message: 'Trạng thái đơn hàng của bạn đã được cập nhật.',
      icon: 'https://res.cloudinary.com/dis180ycw/image/upload/v1766999003/fashion-ecommerce/mailer-images/express-delivery_zsprae.png',
    };

    const context = {
      logoUrl: this.configService.getOrThrow<string>('LOGO_URL'),
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleString('vi-VN'),
      customerAddress: order.customerAddress,
      items: order.items.map((item) => ({
        productName: item.productName,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        price: item.unitPrice.toLocaleString('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }),
        variantText: item.variantAttributes
          ?.map((attr) => `${attr.value}`)
          .join(' - '),
      })),
      statusText: statusInfo.text,
      statusMessage: statusInfo.message,
      statusIcon: statusInfo.icon,
      subtotalFormatted: order.subtotal.toLocaleString('vi-VN'),
      shippingFeeFormatted: order.shippingFee.toLocaleString('vi-VN'),
      totalFormatted: order.total.toLocaleString('vi-VN'),
      currentYear: new Date().getFullYear(),
    };

    await this.mailerService.sendMail({
      to: order.customerEmail,
      subject: `Đơn hàng #${order.orderNumber} - ${statusInfo.text}`,
      template: 'order-status-update',
      context,
    });
  }
}
