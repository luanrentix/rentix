import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cadastro de cliente',
  robots: { index: false, follow: false },
};

export default function CustomerRegistrationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
