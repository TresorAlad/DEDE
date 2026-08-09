import { useEffect, useState } from "react";
import { KeyRound, Save, UserCog } from "lucide-react";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import PasswordInput from "../components/PasswordInput";
import { api } from "../api/client";
import { setAuthUser, useAuthUser } from "../hooks/useAuthUser";

export default function Profile() {
  const { user } = useAuthUser();

  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdErr, setPwdErr] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setOrganization(user.organization_name || "");
    }
  }, [user]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileErr("");
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const updated = await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          organization_name: organization,
        }),
      });
      setAuthUser(updated);
      setProfileMsg("Profil mis à jour.");
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPwdErr("");
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdErr("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdErr("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSavingPwd(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPwdMsg("Mot de passe modifié avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdErr(err.message);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre mot de passe."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleProfileSubmit} className="card">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-primary">Informations</h2>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Nom et prénom
            <input
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              minLength={2}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Organisation
            <input
              className="input-field"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              minLength={2}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Adresse e-mail
            <input
              className="input-field bg-slate-50 text-slate-400"
              value={user?.email || ""}
              disabled
            />
            <span className="mt-1 block text-xs text-slate-400">
              L'adresse e-mail ne peut pas être modifiée.
            </span>
          </label>

          {profileErr && <p className="mt-3 text-sm text-danger">{profileErr}</p>}
          {profileMsg && <p className="mt-3 text-sm text-emerald-600">{profileMsg}</p>}

          <button type="submit" disabled={savingProfile} className="btn-accent mt-5">
            <Save size={16} />
            {savingProfile ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="card">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-primary">Mot de passe</h2>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Mot de passe actuel
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Nouveau mot de passe
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Confirmer le nouveau mot de passe
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          {pwdErr && <p className="mt-3 text-sm text-danger">{pwdErr}</p>}
          {pwdMsg && <p className="mt-3 text-sm text-emerald-600">{pwdMsg}</p>}

          <button type="submit" disabled={savingPwd} className="btn-accent mt-5">
            <Save size={16} />
            {savingPwd ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
