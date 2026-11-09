/**
 * Utility functions for WhatsApp sharing and phone number formatting.
 */

export interface SocialLinks {
  instagram?: string | undefined;
  facebook?: string | undefined;
  twitter?: string | undefined;
  youtube?: string | undefined;
  website?: string | undefined;
  googleReview?: string | undefined;
}

/**
 * Normalizes a phone number for WhatsApp wa.me links.
 * If the country code is missing (e.g., standard 10-digit Indian number),
 * automatically prepends the India country code (+91 / 91).
 * Also converts leading 0 (e.g., 09876543210 -> 919876543210).
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.toString().replace(/\D/g, "");
  if (!cleaned) return "";

  // 10 digits without country code -> prepend 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // 11 digits starting with 0 -> replace 0 with 91
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `91${cleaned.slice(1)}`;
  }

  return cleaned;
}

/**
 * Builds a WhatsApp wa.me URL.
 * If a phone number is provided, addresses the chat directly to that number.
 * If phone is empty, opens WhatsApp's contact picker so the user can choose who to share with.
 */
export function getWhatsAppShareUrl(phone: string | undefined | null, text: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Formats a social link or handle into a valid HTTPS URL.
 */
export function formatSocialUrl(value: string | undefined | null, platform: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanHandle = trimmed.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${cleanHandle}`;
    case "facebook":
      return `https://facebook.com/${cleanHandle}`;
    case "twitter":
      return `https://x.com/${cleanHandle}`;
    case "youtube":
      return `https://youtube.com/${trimmed.startsWith("@") ? trimmed : `@${trimmed}`}`;
    case "website":
    case "googleReview":
    default:
      return `https://${trimmed}`;
  }
}

/**
 * Builds the text message for sharing an invoice on WhatsApp,
 * including configured social media links.
 */
export function buildWhatsAppBillMessage(
  sale: any,
  storeName: string,
  publicLink: string,
  socialLinks?: SocialLinks
): string {
  const total = (sale.totalAmount || 0).toLocaleString();
  const customer = sale.customerName || "Customer";
  const invoiceNumber = sale.invoiceNumber || "Bill";

  let message = `Hello ${customer}, thank you for shopping at *${storeName}*! Your invoice ${invoiceNumber} for *₹${total}* is ready. View it here: ${publicLink}`;

  if (socialLinks) {
    const lines: string[] = [];
    if (socialLinks.instagram?.trim()) {
      lines.push(`📸 Instagram: ${formatSocialUrl(socialLinks.instagram, "instagram")}`);
    }
    if (socialLinks.facebook?.trim()) {
      lines.push(`👍 Facebook: ${formatSocialUrl(socialLinks.facebook, "facebook")}`);
    }
    if (socialLinks.website?.trim()) {
      lines.push(`🌐 Website: ${formatSocialUrl(socialLinks.website, "website")}`);
    }
    if (socialLinks.googleReview?.trim()) {
      lines.push(`⭐ Review us: ${formatSocialUrl(socialLinks.googleReview, "googleReview")}`);
    }
    if (socialLinks.youtube?.trim()) {
      lines.push(`▶️ YouTube: ${formatSocialUrl(socialLinks.youtube, "youtube")}`);
    }
    if (socialLinks.twitter?.trim()) {
      lines.push(`🐦 Twitter/X: ${formatSocialUrl(socialLinks.twitter, "twitter")}`);
    }

    if (lines.length > 0) {
      message += `\n\n*Connect with us:*\n` + lines.join("\n");
    }
  }

  return message;
}

/**
 * Builds the text message for sharing a direct catalog item on WhatsApp.
 */
export function buildCatalogItemShareMessage(
  product: { name: string; pricePerUnit: number; mrp?: number | null | undefined; unit?: string | undefined },
  shopName: string,
  itemUrl: string
): string {
  const discountText =
    product.mrp && product.mrp > product.pricePerUnit
      ? ` (MRP: ₹${product.mrp} - ${Math.round(((product.mrp - product.pricePerUnit) / product.mrp) * 100)}% OFF)`
      : "";

  return `Check out *${product.name}* at *${shopName}*!\n💰 Price: *₹${product.pricePerUnit}*${discountText}${product.unit ? ` per ${product.unit}` : ""}\n\n👉 View and order here: ${itemUrl}`;
}
