import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

/**
 * Real, scannable QR code (uses qrcode.react under the hood).
 * Renders a canvas with proper QR encoding.
 */
export default function RealQRCode({ value, size = 180, brandLogo }) {
  if (!value) return null;
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md inline-block">
      <QRCodeCanvas
        value={value}
        size={size}
        level="H"
        bgColor="#ffffff"
        fgColor="#1a1a1a"
        includeMargin={false}
        imageSettings={brandLogo ? {
          src: brandLogo,
          height: size * 0.18,
          width: size * 0.18,
          excavate: true,
        } : undefined}
      />
    </div>
  );
}