import { useState } from "react";
import Icon from "./Icon";

export default function PasswordInput({ value, onChange, required = false, minLength, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
        <Icon name="lock" size={18} className="text-outline" />
      </span>
      <input
        className="input-field pl-xl pr-10"
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        placeholder={placeholder || "••••••••••••"}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-sm text-outline transition-colors hover:text-primary-container"
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        <Icon name={visible ? "visibility_off" : "visibility"} size={18} />
      </button>
    </div>
  );
}
