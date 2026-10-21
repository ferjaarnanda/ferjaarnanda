export const WHATSAPP_NUMBER = "6289513062106";
export const EMAIL = "arn.techdev@gmail.com";

export const whatsappLink = (message?: string): string =>
  `https://wa.me/6289513062106` +
  (message ? `?text=${encodeURIComponent(message)}` : "");

export const MAILTO = `mailto:arn.techdev@gmail.com`;
