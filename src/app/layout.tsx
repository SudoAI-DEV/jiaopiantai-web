import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "蕉片台 - AI 商品图片生成服务",
    template: "%s | 蕉片台",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/branding/jiaopiantai-logo-transparent-192.png", type: "image/png", sizes: "192x192" },
      { url: "/branding/jiaopiantai-logo-transparent-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/branding/jiaopiantai-logo-transparent-192.png",
    shortcut: "/favicon.ico",
  },
  description: "专业的 AI 商品图片生成服务平台，为服装、饰品等中小商家提供低成本、高质量的商品图服务",
  keywords: ["AI商品图", "电商图片", "商品拍摄", "AI生成", "电商运营"],
  authors: [{ name: "蕉片台" }],
  creator: "蕉片台",
  publisher: "蕉片台",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://jiaopiantai.com",
    siteName: "蕉片台",
    title: "蕉片台 - AI 商品图片生成服务",
    description: "专业的 AI 商品图片生成服务平台",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FDD835",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={geistSans.variable}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
