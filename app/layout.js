import './globals.css';

export const metadata = {
  title: '媒体营销公司',
  description: '一人公司 Agent 管理系统'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
