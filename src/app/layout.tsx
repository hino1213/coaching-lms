import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'コーチング学習サイト',
  description: 'コーチング・カウンセリング・マインドセット講座の学習プラットフォーム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
