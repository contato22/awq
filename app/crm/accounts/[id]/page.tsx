import { SEED_ACCOUNTS } from "@/lib/crm-db";
import AccountDetailClient from "./AccountDetailClient";

export function generateStaticParams() {
  return SEED_ACCOUNTS.map(a => ({ id: a.account_id }));
}

export default function AccountDetailPage() {
  return <AccountDetailClient />;
}
