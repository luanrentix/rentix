import "./globals.css"

export const metadata = {
  title: "Rentix",
  description: "Sistema de Gestão de Locações",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}