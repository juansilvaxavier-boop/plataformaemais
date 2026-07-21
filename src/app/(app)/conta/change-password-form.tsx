"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { changeMyPassword } from "./actions";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const result = await changeMyPassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Não foi possível alterar a senha.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <Label>Senha atual</Label>
        <Input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <Label>Nova senha</Label>
        <Input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div>
        <Label>Confirmar nova senha</Label>
        <Input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Senha alterada com sucesso.</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
