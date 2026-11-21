import type { Metadata } from "next";
import CustomerRegistrationPage from "../registration-form";

type Props = { params: Promise<{ token: string }> };
type RegistrationInfo = { companyName?: string; companyPhone?: string | null; companyEmail?: string | null; companyDocument?: string | null };

async function getRegistrationInfo(token: string): Promise<RegistrationInfo | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const response = await fetch(`${apiUrl}/vendas/clientes-cadastro-publico/consultar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" });
    return response.ok ? (await response.json()) as RegistrationInfo : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const company = await getRegistrationInfo(token);
  const name = company?.companyName || "Cadastro de cliente";
  const description = company ? `Preencha seus dados para concluir seu cadastro com ${name}.` : "Formul?rio seguro de cadastro de cliente.";
  const image = `/cadastro-cliente/${encodeURIComponent(token)}/opengraph-image`;
  return { title: `Cadastro de cliente | ${name}`, description, robots: { index: false, follow: false }, openGraph: { title: name, description, type: "website", images: [{ url: image, width: 1200, height: 630, alt: name }] }, twitter: { card: "summary_large_image", title: name, description, images: [image] } };
}

export default async function CustomerRegistrationTokenPage({ params }: Props) {
  const { token } = await params;
  return <CustomerRegistrationPage initialToken={token} />;
}
