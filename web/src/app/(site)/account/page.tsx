import type { Metadata } from "next";
import Account from "@/components/Account";

export const metadata: Metadata = { title: "your account" };

export default function Page() {
  return <Account />;
}
