import AccountDetailClient from "./AccountDetailClient";

export const dynamicParams = process.env.STATIC_EXPORT !== "1";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function AccountDetailPage() {
  return <AccountDetailClient />;
}
