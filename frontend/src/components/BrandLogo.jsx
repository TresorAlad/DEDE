import { useTheme } from "../hooks/useTheme";

const LOGO_SRC = {
  light: "/logo-light.png",
  dark: "/logo-dark.png",
};

export default function BrandLogo({ className, alt = "ƉeƉeFIA", ...props }) {
  const { theme } = useTheme();

  return (
    <img
      src={LOGO_SRC[theme === "light" ? "light" : "dark"]}
      alt={alt}
      width={500}
      height={145}
      className={className}
      {...props}
    />
  );
}
