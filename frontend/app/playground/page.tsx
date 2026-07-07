"use client";

import { JudgeWorkbench } from "@/components/JudgeWorkbench";
import { ProtectedPage } from "@/components/ProtectedPage";

export default function PlaygroundPage() {
  return <ProtectedPage>{() => <JudgeWorkbench />}</ProtectedPage>;
}
