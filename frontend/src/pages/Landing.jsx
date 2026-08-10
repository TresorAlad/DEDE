import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { getToken } from "../api/client";

const HERO_HIGHLIGHTS = [
  { icon: "verified_user", label: "Propriété vérifiée avant tout scan" },
  { icon: "schedule", label: "Résultats en quelques minutes" },
  { icon: "neurology", label: "Priorisation assistée par IA" },
  { icon: "description", label: "Rapport exportable en PDF" },
];

const STEPS = [
  {
    icon: "add_link",
    title: "Déclarez votre domaine",
    text: "Renseignez le domaine et l'adresse à surveiller. Aucune installation, aucun agent à déployer.",
  },
  {
    icon: "key",
    title: "Prouvez que vous en êtes propriétaire",
    text: "Déposez le fichier de vérification à la racine de votre site. Sans cette preuve, aucun audit ne démarre.",
  },
  {
    icon: "play_arrow",
    title: "Lancez l'audit",
    text: "Le moteur enchaîne ses modules d'analyse et vous suivez chaque étape en direct dans la console.",
  },
  {
    icon: "assessment",
    title: "Exploitez le rapport",
    text: "Score, risques classés par priorité et plan de correction. Interrogez ensuite l'assistant sur vos résultats.",
  },
];

const REPORT_CONTENT = [
  {
    icon: "speed",
    title: "Score de sécurité sur 100",
    text: "Une note globale et un niveau de risque, comparables d'un audit à l'autre pour mesurer vos progrès.",
  },
  {
    icon: "conversion_path",
    title: "Répartition par catégorie",
    text: "Surface exposée, chiffrement, en-têtes et vulnérabilités : vous voyez immédiatement où se concentre le risque.",
  },
  {
    icon: "lightbulb",
    title: "Correctifs priorisés",
    text: "Chaque constat est accompagné d'une explication en langage clair et des actions concrètes à mener.",
  },
  {
    icon: "forum",
    title: "Assistant conversationnel",
    text: "Posez vos questions sur un audit précis et obtenez des réponses fondées sur vos résultats réels.",
  },
];

const COMMITMENTS = [
  {
    icon: "shield_lock",
    title: "Aucun audit sans consentement",
    text: "La vérification de propriété est obligatoire. Personne ne peut lancer un scan sur un domaine qui ne lui appartient pas.",
  },
  {
    icon: "corporate_fare",
    title: "Cloisonnement par organisation",
    text: "Vos plateformes, vos audits et vos rapports restent strictement rattachés à votre compte.",
  },
  {
    icon: "history",
    title: "Historique conservé",
    text: "Chaque audit est archivé avec son horodatage, ce qui permet de démontrer l'évolution de votre posture.",
  },
];

const FAQ = [
  {
    question: "Faut-il installer un logiciel ou un agent ?",
    answer:
      "Non. Tout se pilote depuis le navigateur. Vous déclarez un domaine, vous prouvez qu'il vous appartient, et l'analyse est menée depuis notre infrastructure.",
  },
  {
    question: "Puis-je auditer n'importe quel site ?",
    answer:
      "Non, et c'est volontaire. Tant que la propriété du domaine n'est pas vérifiée, le bouton d'audit reste inactif. Cette règle protège aussi bien vos actifs que ceux des autres.",
  },
  {
    question: "Combien de temps dure un audit ?",
    answer:
      "Quelques minutes dans la majorité des cas. La durée dépend surtout de l'étendue de votre surface exposée. La progression s'affiche étape par étape pendant l'exécution.",
  },
  {
    question: "L'analyse risque-t-elle de perturber mon site ?",
    answer:
      "Les contrôles sont menés de manière mesurée et non destructive. L'objectif est d'observer votre exposition telle qu'un attaquant la verrait, sans dégrader votre service.",
  },
  {
    question: "Que deviennent mes résultats ?",
    answer:
      "Ils sont conservés dans votre espace et ne sont accessibles qu'à votre compte. Le détail des traitements figure dans notre politique de confidentialité.",
  },
];

const PLAN_FEATURES = [
  "Cartographie illimitée de la surface exposée",
  "Audits à la demande sur vos domaines vérifiés",
  "Analyse et priorisation par l'IA",
  "Rapports PDF et assistant conversationnel",
];

const FOOTER_LINKS = [
  {
    title: "Produit",
    links: [
      { label: "Capacités", to: "#capacites", hash: true },
      { label: "Démarche", to: "#demarche", hash: true },
      { label: "Offre", to: "#offre", hash: true },
      { label: "Questions fréquentes", to: "#faq", hash: true },
    ],
  },
  {
    title: "Accès",
    links: [
      { label: "Connexion", to: "/login" },
      { label: "Créer un compte", to: "/signup" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Conditions d'utilisation", to: "/cgu" },
      { label: "Politique de confidentialité", to: "/confidentialite" },
    ],
  },
];

const NAV_LINKS = [
  { label: "Capacités", href: "#capacites" },
  { label: "Démarche", href: "#demarche" },
  { label: "Offre", href: "#offre" },
  { label: "FAQ", href: "#faq" },
];

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-xl text-center">
      <span className="chip mb-sm border-outline-variant/40 bg-surface-variant/40 text-on-surface-variant">
        {eyebrow}
      </span>
      <h2 className="mb-sm font-headline-md text-headline-md text-primary">{title}</h2>
      {subtitle && <p className="mx-auto max-w-2xl text-on-surface-variant">{subtitle}</p>}
    </div>
  );
}

export default function Landing() {
  const authenticated = Boolean(getToken());
  const { hash } = useLocation();

  // Le navigateur ne peut pas cibler l'ancre : la section n'existe pas encore
  // au moment ou l'URL est lue par le routeur.
  useEffect(() => {
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  const primaryCta = authenticated
    ? { to: "/dashboard", label: "Ouvrir la console" }
    : { to: "/signup", label: "Lancer un premier audit" };

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-background antialiased">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-gutter backdrop-blur-md">
        <div className="flex items-center gap-xs">
          <Icon name="security" fill className="text-primary-container" />
          <span className="font-headline-sm text-headline-sm font-bold text-primary">ƉEƉE</span>
        </div>

        <nav className="hidden gap-md lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-on-surface-variant transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-sm">
          {!authenticated && (
            <Link
              to="/signup"
              className="hidden text-on-surface-variant transition-colors hover:text-primary sm:block"
            >
              Créer un compte
            </Link>
          )}
          <Link
            to={authenticated ? "/dashboard" : "/login"}
            className="rounded border border-primary-container px-sm py-xs text-primary-container transition-all duration-200 hover:bg-primary-container hover:text-surface"
          >
            {authenticated ? "Ouvrir la console" : "Connexion"}
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-16">
        {/* Hero */}
        <section className="tech-grid relative flex min-h-[760px] items-center justify-center overflow-hidden px-gutter py-xl">
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-background/90" />

          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-lg text-center">
            <div className="inline-flex items-center gap-xs rounded-pill border border-primary-container/30 bg-surface-variant/50 px-sm py-xs font-label-caps text-label-caps uppercase text-primary-container">
              <span className="h-2 w-2 animate-pulse rounded-pill bg-primary-container" />
              Système en ligne
            </div>

            <h1 className="max-w-3xl font-display-lg text-display-lg text-primary">
              L'audit de cybersécurité automatisé pour les équipes modernes
            </h1>

            <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Découvrez ce que votre organisation expose sur Internet, mesurez le risque associé et
              obtenez un plan de correction lisible. Sans expertise préalable, sans installation.
            </p>

            <div className="mt-md flex flex-col gap-sm sm:flex-row">
              <Link
                to={primaryCta.to}
                className="rounded border border-primary-container bg-primary-container/10 px-lg py-sm font-bold text-primary-container shadow-[0_0_15px_rgba(95,251,214,0.2)] transition-all duration-300 hover:bg-primary-container hover:text-surface"
              >
                {primaryCta.label}
              </Link>
              <a
                href="#demarche"
                className="rounded border border-outline-variant px-lg py-sm text-on-surface transition-all duration-300 hover:bg-surface-variant"
              >
                Comprendre la démarche
              </a>
            </div>

            <div className="mt-lg grid w-full grid-cols-1 gap-sm border-t border-outline-variant/30 pt-lg sm:grid-cols-2 lg:grid-cols-4">
              {HERO_HIGHLIGHTS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-center gap-sm text-left text-on-surface-variant"
                >
                  <Icon name={item.icon} size={18} className="text-primary-container" />
                  <span className="font-label-caps text-label-caps uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capacités */}
        <section id="capacites" className="scroll-mt-16 bg-surface-container-lowest px-gutter py-xl">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Capacités"
              title="Une chaîne de sécurité complète"
              subtitle="De la découverte de vos actifs exposés jusqu'au plan de correction, sans rupture."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-12">
              <div className="group relative overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low p-md md:col-span-8">
                <div className="absolute right-0 top-0 -z-10 h-32 w-32 rounded-bl-full bg-primary-container/5 transition-colors group-hover:bg-primary-container/10" />
                <div className="mb-md flex items-center gap-sm border-b border-outline-variant/30 pb-sm">
                  <Icon name="explore" className="text-primary-container" />
                  <h3 className="font-headline-sm text-headline-sm text-primary">
                    Cartographie de la surface exposée
                  </h3>
                </div>
                <p className="mb-md text-on-surface-variant">
                  Sous-domaines oubliés, environnements de test laissés en ligne, services publiés
                  sans que personne ne s'en souvienne : le moteur reconstitue ce que voit un
                  attaquant depuis l'extérieur, avant qu'il ne s'en serve.
                </p>
                <div className="rounded border border-outline-variant/50 bg-surface p-sm font-data-mono text-data-mono text-secondary-fixed-dim">
                  &gt; audit --domaine exemple.tg
                  <br />
                  [+] 142 actifs exposés identifiés
                  <br />
                  [+] Corrélation des enregistrements en cours...
                </div>
              </div>

              <div className="relative flex flex-col overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low p-md md:col-span-4">
                <div className="mb-md flex items-center gap-sm border-b border-outline-variant/30 pb-sm">
                  <Icon name="psychology" className="text-tertiary-fixed-dim" />
                  <h3 className="font-headline-sm text-headline-sm text-primary">
                    Analyse assistée par IA
                  </h3>
                </div>
                <p className="text-on-surface-variant">
                  Le bruit est écarté, les constats sont traduits en langage clair et classés par
                  urgence. Vous savez par quoi commencer lundi matin.
                </p>
                <div className="mt-auto pt-sm">
                  <span className="inline-block rounded border border-tertiary-container/20 bg-tertiary-container/10 px-xs py-[2px] font-label-caps text-label-caps uppercase text-tertiary-fixed-dim">
                    Priorisation automatique
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-md md:col-span-12">
                <div className="mb-md flex items-center gap-sm border-b border-outline-variant/30 pb-sm">
                  <Icon name="radar" className="text-error-container" />
                  <h3 className="font-headline-sm text-headline-sm text-primary">
                    Détection des vulnérabilités et des mauvaises configurations
                  </h3>
                </div>

                <div className="grid items-center gap-lg md:grid-cols-2">
                  <div>
                    <p className="mb-md text-on-surface-variant">
                      Le moteur recherche les failles connues et les erreurs de paramétrage les plus
                      exploitées, puis contrôle la solidité de votre chiffrement et de vos en-têtes
                      de sécurité. La base de signatures est tenue à jour en continu.
                    </p>
                    <ul className="space-y-sm">
                      {[
                        "Vulnérabilités connues et configurations à risque",
                        "Qualité du chiffrement TLS et validité des certificats",
                        "En-têtes de sécurité HTTP manquants ou permissifs",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-sm">
                          <Icon
                            name="check"
                            size={16}
                            className="mt-1 shrink-0 text-primary-container"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative flex h-48 items-center justify-center overflow-hidden rounded border border-outline-variant/50 bg-surface">
                    <div className="tech-grid absolute inset-0 opacity-30" />
                    <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-pill border-2 border-error/20">
                      <div className="flex h-20 w-20 items-center justify-center rounded-pill border-2 border-error/40 animate-[spin_4s_linear_infinite]">
                        <div className="h-16 w-16 rounded-pill border-2 border-error/60 border-t-error animate-[spin_2s_linear_infinite]" />
                      </div>
                      <Icon name="warning" className="absolute text-error" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Démarche */}
        <section id="demarche" className="scroll-mt-16 bg-surface px-gutter py-xl">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Démarche"
              title="Quatre étapes, du domaine au plan d'action"
              subtitle="Un parcours pensé pour des équipes qui n'ont ni le temps ni les moyens d'un audit manuel."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="relative flex flex-col rounded-lg border border-outline-variant/30 bg-surface-container-low p-md"
                >
                  <span className="absolute right-md top-md font-display-lg text-[40px] leading-none text-outline-variant/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mb-sm inline-flex h-10 w-10 items-center justify-center rounded border border-primary-container/30 bg-primary-container/10 text-primary-container">
                    <Icon name={step.icon} size={20} />
                  </span>
                  <h3 className="mb-xs font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                    {step.title}
                  </h3>
                  <p className="text-[14px] leading-6 text-on-surface-variant">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contenu du rapport */}
        <section className="bg-surface-container-lowest px-gutter py-xl">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Livrable"
              title="Ce que vous recevez à la fin d'un audit"
              subtitle="Un rapport exploitable par une équipe technique comme par une direction."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              {REPORT_CONTENT.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-md rounded-lg border border-outline-variant/30 bg-surface-container-low p-md"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary-container/30 bg-primary-container/10 text-primary-container">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div>
                    <h3 className="mb-xs font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                      {item.title}
                    </h3>
                    <p className="text-on-surface-variant">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Engagements */}
        <section className="bg-surface px-gutter py-xl">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Engagements"
              title="Un audit encadré, jamais subi"
              subtitle="La sécurité d'une plateforme d'audit se juge d'abord à ce qu'elle s'interdit de faire."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-3">
              {COMMITMENTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-md"
                >
                  <span className="mb-sm inline-flex h-10 w-10 items-center justify-center rounded border border-primary-container/30 bg-primary-container/10 text-primary-container">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <h3 className="mb-xs font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                    {item.title}
                  </h3>
                  <p className="text-on-surface-variant">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Offre */}
        <section id="offre" className="scroll-mt-16 bg-surface-container-lowest px-gutter py-xl">
          <div className="mx-auto max-w-4xl text-center">
            <SectionHeading
              eyebrow="Offre"
              title="Une offre simple pour les PME"
              subtitle="Tout ce qu'il faut pour sécuriser votre infrastructure, sans complexité."
            />

            <div className="relative mx-auto max-w-md rounded-lg border border-primary-container/50 bg-surface-container-low p-lg shadow-[0_0_15px_rgba(95,251,214,0.2)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-primary-container px-sm py-xs font-label-caps text-label-caps uppercase text-surface">
                Recommandé
              </div>

              <h3 className="mb-xs font-headline-sm text-headline-sm text-primary">Offre pilote</h3>
              <div className="mb-md">
                <span className="font-display-lg text-display-lg text-primary">Gratuit</span>
                <span className="text-on-surface-variant"> / phase pilote</span>
              </div>

              <ul className="mb-lg space-y-sm text-left">
                {PLAN_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-sm text-on-surface">
                    <Icon name="done" size={20} className="mt-1 shrink-0 text-primary-container" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to={primaryCta.to}
                className="block w-full rounded border border-primary-container bg-primary-container/10 py-sm font-bold text-primary-container transition-colors hover:bg-primary-container hover:text-surface"
              >
                {authenticated ? "Ouvrir la console" : "Commencer"}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 bg-surface px-gutter py-xl">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />

            <div className="space-y-sm">
              {FAQ.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-lg border border-outline-variant/30 bg-surface-container-low px-md py-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-sm py-xs font-headline-sm text-primary marker:content-none">
                    <span style={{ fontSize: "18px" }}>{item.question}</span>
                    <Icon
                      name="chevron_right"
                      className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <p className="pb-sm pt-xs text-on-surface-variant">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="px-gutter pb-xl">
          <div className="tech-grid relative mx-auto max-w-5xl overflow-hidden rounded-lg border border-primary-container/30 bg-surface-container-low px-md py-lg text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-low/80" />
            <div className="relative z-10 flex flex-col items-center gap-sm">
              <h2 className="font-headline-md text-headline-md text-primary">
                Vous ne pouvez pas protéger ce que vous ne voyez pas
              </h2>
              <p className="max-w-2xl text-on-surface-variant">
                Lancez un premier audit sur votre domaine et découvrez votre exposition réelle en
                quelques minutes.
              </p>
              <Link
                to={primaryCta.to}
                className="mt-sm rounded border border-primary-container bg-primary-container/10 px-lg py-sm font-bold text-primary-container transition-all duration-300 hover:bg-primary-container hover:text-surface"
              >
                {primaryCta.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest px-gutter py-lg">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-lg md:grid-cols-4">
          <div>
            <div className="mb-sm flex items-center gap-xs">
              <Icon name="security" className="text-primary-container" />
              <span className="font-headline-sm text-headline-sm font-bold text-primary">ƉEƉE</span>
            </div>
            <p className="text-[14px] leading-5 text-on-surface-variant">
              Moteur d'audit de cybersécurité automatisé pour les équipes techniques.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <h4 className="mb-sm font-label-caps text-label-caps uppercase text-primary">
                {column.title}
              </h4>
              <ul className="space-y-xs">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.hash ? (
                      <a
                        href={link.to}
                        className="text-[14px] text-on-surface-variant transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-[14px] text-on-surface-variant transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-lg max-w-7xl border-t border-outline-variant/30 pt-sm text-center text-[14px] text-on-surface-variant">
          © 2026 ƉEƉE. Sécurisé dès la conception.
        </div>
      </footer>
    </div>
  );
}
