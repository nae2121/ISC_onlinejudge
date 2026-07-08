import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#020617] text-white">
      <AuthForm mode="register" />
    </main>
  );
}
