import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import PasswordInput from "../components/PasswordInput";
import { api } from "../api/client";
import { setAuthUser, useAuthUser } from "../hooks/useAuthUser";

function Feedback({ error, message }) {
  if (!error && !message) return null;
  return (
    <p
      className={`mt-sm flex items-center gap-base rounded border px-sm py-base font-data-mono text-[12px] ${
        error
          ? "border-critical/30 bg-critical/10 text-critical"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      <Icon name={error ? "error" : "check_circle"} size={16} />
      {error || message}
    </p>
  );
}

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
  const [pwdConfirmOpen, setPwdConfirmOpen] = useState(false);

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

  function handlePasswordSubmit(event) {
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
    setPwdConfirmOpen(true);
  }

  async function confirmPasswordChange() {
    setSavingPwd(true);
    setPwdErr("");
    setPwdMsg(null);
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
      setPwdConfirmOpen(false);
    } catch (err) {
      setPwdErr(err.message);
      setPwdConfirmOpen(false);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Réglages du compte"
        subtitle="Gérez votre identité opérateur et vos accès."
      />

      <div className="col-span-12 lg:col-span-6">
        <div className="panel h-full">
          <div className="panel-veil" />
          <form onSubmit={handleProfileSubmit} className="relative z-10 flex h-full flex-col p-md">
            <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
              <h2 className="panel-title">Identité opérateur</h2>
              <Icon name="badge" className="text-on-surface-variant" />
            </div>

            <div className="space-y-md">
              <div>
                <label className="field-label" htmlFor="fullname">
                  Nom et prénom
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                    <Icon name="person" size={18} className="text-outline" />
                  </span>
                  <input
                    id="fullname"
                    className="input-field pl-xl"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    minLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="organization">
                  Organisation
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                    <Icon name="corporate_fare" size={18} className="text-outline" />
                  </span>
                  <input
                    id="organization"
                    className="input-field pl-xl"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    minLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="email">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                    <Icon name="mail" size={18} className="text-outline" />
                  </span>
                  <input
                    id="email"
                    className="input-field cursor-not-allowed pl-xl opacity-60"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
                <span className="mt-base block font-data-mono text-[12px] text-on-surface-variant">
                  L'adresse e-mail ne peut pas être modifiée.
                </span>
              </div>
            </div>

            <Feedback error={profileErr} message={profileMsg} />

            <div className="mt-auto pt-md">
              <button type="submit" disabled={savingProfile} className="btn-primary">
                <Icon name="save" size={16} />
                {savingProfile ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6">
        <div className="panel h-full">
          <div className="panel-veil" />
          <form onSubmit={handlePasswordSubmit} className="relative z-10 flex h-full flex-col p-md">
            <div className="mb-md flex items-center justify-between border-b border-outline-variant/30 pb-xs">
              <h2 className="panel-title">Clé d'accès</h2>
              <Icon name="key" className="text-on-surface-variant" />
            </div>

            <div className="space-y-md">
              <div>
                <label className="field-label">Mot de passe actuel</label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Nouveau mot de passe</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="field-label">Confirmation du nouveau mot de passe</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <Feedback error={pwdErr} message={pwdMsg} />

            <div className="mt-auto pt-md">
              <button type="submit" disabled={savingPwd} className="btn-primary">
                <Icon name="lock_reset" size={16} />
                {savingPwd ? "Modification..." : "Modifier le mot de passe"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={pwdConfirmOpen}
        tone="primary"
        title="Confirmer le nouveau mot de passe ?"
        description="Votre mot de passe actuel sera remplacé. Vous resterez connecté sur cet appareil."
        details="Utilisez un mot de passe unique, d'au moins 8 caractères, que vous n'employez nulle part ailleurs."
        confirmLabel="Confirmer la modification"
        cancelLabel="Annuler"
        loadingLabel="Modification..."
        loading={savingPwd}
        onConfirm={confirmPasswordChange}
        onCancel={() => !savingPwd && setPwdConfirmOpen(false)}
      />
    </AppShell>
  );
}
