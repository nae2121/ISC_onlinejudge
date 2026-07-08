import { AuthForm } from "@/components/AuthForm";
import { PublicHeader } from "@/components/PublicHeader";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#020617] text-white">
      <PublicHeader />
      <AuthForm mode="login" />
    </main>
  );
}
