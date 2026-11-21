import { ImageResponse } from "next/og";
import { getPublicSalesCustomerRegistration } from "@/services/vendas.service";

export const alt = "Cadastro da loja";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
type Props = { params: Promise<{ token: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const { token } = await params;
  let company: Awaited<ReturnType<typeof getPublicSalesCustomerRegistration>> | null = null;
  try { company = await getPublicSalesCustomerRegistration(token); } catch { /* A metadata gen?rica atende links expirados. */ }
  const details = [company?.companyDocument, company?.companyPhone, company?.companyEmail, company?.website].filter(Boolean).join(" ? ");
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, background: "linear-gradient(135deg, #fff7ed, #ffffff)", color: "#111827" }}><div style={{ display: "flex", alignItems: "center", gap: 28 }}>{company?.logo && <img src={company.logo} width="150" height="150" style={{ objectFit: "contain", background: "white", borderRadius: 24, padding: 12 }} />}<div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 28, color: "#ea580c" }}>Cadastro de cliente</div><div style={{ fontSize: 64, fontWeight: 800, marginTop: 12 }}>{company?.companyName || "Sua loja"}</div></div></div><div style={{ fontSize: 27, marginTop: 42, color: "#475569" }}>{details || "Preencha seus dados com seguran?a"}</div><div style={{ fontSize: 22, marginTop: 24, color: "#64748b" }}>Link individual ? v?lido por 7 dias</div></div>, size);
}
