import AccountDetailClient from "./AccountDetailClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function AccountDetailPage() {
  return <AccountDetailClient />;
}
