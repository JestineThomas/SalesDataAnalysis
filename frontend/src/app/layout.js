import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'Sales Data Analysis System | Retail & Textile BI',
  description: 'Enterprise Business Intelligence for Sales, Customer, and Product Analytics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
