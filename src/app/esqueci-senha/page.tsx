"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { requestPasswordReset } from "./actions";

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await requestPasswordReset(formData);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="text-lg font-semibold text-center text-slate-700 mb-6">
          Esqueci minha senha
        </h1>

        {sent ? (
          <p className="text-sm text-slate-600 text-center">
            Se o e-mail informado tiver uma conta ativa, você receberá um link para redefinir sua
            senha em instantes. Verifique também a caixa de spam.
          </p>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="voce@empresa.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg py-2 text-sm transition-colors"
            >
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
