import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, KanbanSquare, Loader2, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getPayloadErrorMessage, getRequestErrorMessage } from "@/lib/errors";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
  rememberMe: z.boolean().default(true)
});

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caracteres.")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre.");

const registerSchema = z
  .object({
    firstName: z.string().min(2).max(80),
    lastName: z.string().min(2).max(80),
    email: z.string().email(),
    password: passwordSchema.max(128),
    confirmPassword: z.string().min(1, "Confirme ton mot de passe.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"]
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type AuthMode = "login" | "register";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
};

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-coral">{message}</p>;
}

function isAuthResponse(payload: unknown): payload is AuthResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AuthResponse>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    !!candidate.user &&
    typeof candidate.user === "object"
  );
}

async function requestAuth(path: "login" | "register", body: unknown): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("API indisponible. Verifie que l'application API est demarree puis reessaie.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getPayloadErrorMessage(payload, "La demande a échoué."));
  }

  if (!isAuthResponse(payload)) {
    throw new Error("Réponse API invalide. Vérifie que l'application API est bien démarrée.");
  }

  return payload;
}

function persistSession(result: AuthResponse, rememberMe: boolean) {
  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem("qualis.accessToken", result.accessToken);
  storage.setItem("qualis.refreshToken", result.refreshToken);
  storage.setItem("qualis.user", JSON.stringify(result.user));
}

function formatUserName(user: Pick<AuthResponse["user"], "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(window.location.pathname.includes("register") ? "register" : "login");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true
    }
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const isLogin = mode === "login";
  const isSubmitting = loginForm.formState.isSubmitting || registerForm.formState.isSubmitting;
  const redirectTo = typeof location.state?.from?.pathname === "string" ? location.state.from.pathname : "/";

  async function submitLogin(values: LoginForm) {
    setError(null);
    setMessage(null);

    try {
      const result = await requestAuth("login", values);
      persistSession(result, values.rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Connexion impossible."));
    }
  }

  async function submitRegister(values: RegisterForm) {
    setError(null);
    setMessage(null);

    try {
      const result = await requestAuth("register", {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password
      });

      persistSession(result, true);
      setMessage(`Compte cree pour ${formatUserName(result.user)}.`);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Création de compte impossible."));
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <Card className="mx-auto w-full max-w-[32rem] p-5 sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-ink">
                <KanbanSquare size={18} />
              </div>
              <div>
                <p className="font-semibold">TraceFlow</p>
                <p className="text-xs text-muted">Transformez vos idées en projets maîtrisés.</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="mb-7 flex rounded-lg border border-line bg-white/[0.035] p-1">
            <button
              className={`h-11 flex-1 rounded-md text-sm font-medium transition ${isLogin ? "bg-white text-ink shadow-sm" : "text-muted hover:text-white"}`}
              type="button"
              onClick={() => setMode("login")}
            >
              Connexion
            </button>
            <button
              className={`h-11 flex-1 rounded-md text-sm font-medium transition ${!isLogin ? "bg-white text-ink shadow-sm" : "text-muted hover:text-white"}`}
              type="button"
              onClick={() => setMode("register")}
            >
              Creation de compte
            </button>
          </div>

          <div className="mb-7">
            <p className="text-sm text-cyan">{isLogin ? "Connexion" : "Nouveau profil"}</p>
            <h2 className="mt-2 text-3xl font-semibold">{isLogin ? "Bon retour" : "Creer un compte"}</h2>
          </div>

          {isLogin ? (
            <form className="space-y-5" onSubmit={loginForm.handleSubmit(submitLogin)}>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <Input className="pl-10" autoComplete="email" {...loginForm.register("email")} />
                </div>
                <FieldError message={loginForm.formState.errors.email ? "Email invalide." : undefined} />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Mot de passe</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <Input
                    className="pl-10 pr-11"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  <button
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-white/[0.06] hover:text-white"
                    type="button"
                    aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowLoginPassword((current) => !current)}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError message={loginForm.formState.errors.password?.message} />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" className="rounded border-line bg-white/5" {...loginForm.register("rememberMe")} />
                Rester connecte
              </label>
              <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                {loginForm.formState.isSubmitting ? (
                  <>
                    Connexion...
                    <Loader2 className="animate-spin" size={16} />
                  </>
                ) : (
                  <>
                    Entrer
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={registerForm.handleSubmit(submitRegister)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Prenom</span>
                  <Input autoComplete="given-name" {...registerForm.register("firstName")} />
                  <FieldError message={registerForm.formState.errors.firstName ? "Le prenom doit contenir au moins 2 caracteres." : undefined} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Nom</span>
                  <Input autoComplete="family-name" {...registerForm.register("lastName")} />
                  <FieldError message={registerForm.formState.errors.lastName ? "Le nom doit contenir au moins 2 caracteres." : undefined} />
                </label>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <Input className="pl-10" autoComplete="email" {...registerForm.register("email")} />
                </div>
                <FieldError message={registerForm.formState.errors.email ? "Email invalide." : undefined} />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Mot de passe</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <Input className="pl-10" type="password" autoComplete="new-password" {...registerForm.register("password")} />
                </div>
                <FieldError message={registerForm.formState.errors.password?.message} />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Confirmer le mot de passe</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <Input className="pl-10" type="password" autoComplete="new-password" {...registerForm.register("confirmPassword")} />
                </div>
                <FieldError message={registerForm.formState.errors.confirmPassword?.message} />
              </label>
              <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                Creer mon profil
                <UserPlus size={16} />
              </Button>
            </form>
          )}

          {error && <div className="mt-5 rounded-lg border border-coral/40 bg-coral/10 p-4 text-sm text-coral">{error}</div>}
          {message && <div className="mt-5 rounded-lg border border-mint/40 bg-mint/10 p-4 text-sm text-mint">{message}</div>}
        </Card>
      </div>
    </div>
  );
}
