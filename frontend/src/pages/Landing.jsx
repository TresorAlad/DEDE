import { animate, onScroll, utils } from "animejs";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import AgentTeamShowcase from "../components/AgentTeamShowcase";
import AnimatedText from "../components/AnimatedText";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import ThemeToggle from "../components/ThemeToggle";
import useCountUp from "../hooks/useCountUp";
import { DURATION, EASE, prefersReducedMotion } from "../motion";
import { getToken } from "../api/client";

const HERO_HIGHLIGHTS = [
  { icon: "hub", label: "Équipe d'agents dédiée à votre cible" },
  { icon: "verified_user", label: "Propriété vérifiée avant tout scan" },
  { icon: "neurology", label: "Priorisation assistée par IA" },
  { icon: "description", label: "Rapport exportable en PDF" },
];

const AGENT_ROLES = [
  {
    icon: "hub",
    title: "Orchestrateur",
    text: "Il découpe la mission en tâches, affecte chaque spécialiste, récupère les résultats et consolide le tout sans intervention humaine.",
  },
  {
    icon: "dns",
    title: "Reconnaissance",
    text: "Cartographie la surface exposée : sous-domaines, services publiés, environnements oubliés. C'est ce que voit un attaquant.",
  },
  {
    icon: "radar",
    title: "Scanner",
    text: "Interroge chaque cible découverte : vulnérabilités connues, configurations à risque, failles récentes de la base de signatures.",
  },
  {
    icon: "lock",
    title: "TLS & en-têtes",
    text: "Contrôle la solidité du chiffrement, la validité des certificats et la présence des en-têtes de sécurité HTTP.",
  },
  {
    icon: "neurology",
    title: "Analyste IA",
    text: "Traduit les constats techniques en langage clair, élimine le bruit et classe les risques par urgence d'action.",
  },
];

const STEPS = [
  {
    icon: "add_link",
    title: "Déclarez votre domaine",
    text: "Renseignez le domaine et l'adresse à surveiller. Aucune installation, aucun agent à déployer de votre côté.",
  },
  {
    icon: "key",
    title: "Prouvez que vous en êtes propriétaire",
    text: "Déposez le fichier de vérification à la racine de votre site. Sans cette preuve, aucun audit ne démarre.",
  },
  {
    icon: "play_arrow",
    title: "Lancez l'équipe d'agents",
    text: "L'orchestrateur répartit les tâches entre les agents spécialisés. Suivez chaque agent en direct dans le graphe d'exécution.",
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
    question: "Qu'est-ce qu'un audit mené par des agents ?",
    answer:
      "Au lieu d'enchaîner des outils préprogrammés, le moteur constitue une petite équipe d'agents : un orchestrateur distribue les tâches, des agents spécialisés exécutent la reconnaissance et les scans, un analyste IA consolide. Chaque agent rend compte de son travail, ce qui rend l'exécution transparente.",
  },
  {
    question: "Faut-il installer un logiciel ou un agent ?",
    answer:
      "Non. Tout se pilote depuis le navigateur. Vous déclarez un domaine, vous prouvez qu'il vous appartient, et l'équipe d'agents est déployée depuis notre infrastructure.",
  },
  {
    question: "Puis-je auditer n'importe quel site ?",
    answer:
      "Non, et c'est volontaire. Tant que la propriété du domaine n'est pas vérifiée, le bouton d'audit reste inactif. Cette règle protège aussi bien vos actifs que ceux des autres.",
  },
  {
    question: "Combien de temps dure un audit ?",
    answer:
      "Quelques minutes dans la majorité des cas. La durée dépend surtout de l'étendue de votre surface exposée. Le graphe d'orchestration affiche la progression de chaque agent pendant l'exécution.",
  },
  {
    question: "L'analyse risque-t-elle de perturber mon site ?",
    answer:
      "Les contrôles sont menés de manière mesurée et non destructive. L'objectif est d'observer votre exposition telle qu'un attaquant la verrait, sans dégrader votre service.",
  },
];

const PLAN_FEATURES = [
  "Cartographie illimitée de la surface exposée",
  "Audits à la demande sur vos domaines vérifiés",
  "Équipe d'agents orchestrée, suivi en direct",
  "Analyse et priorisation par l'IA",
  "Rapports PDF et assistant conversationnel",
];

const FOOTER_LINKS = [
  {
    title: "Produit",
    links: [
      { label: "L'équipe d'agents", to: "#agents", hash: true },
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
  { label: "Agents", href: "#agents" },
  { label: "Démarche", href: "#demarche" },
  { label: "Offre", href: "#offre" },
  { label: "FAQ", href: "#faq" },
];

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-xl text-center">
      <span
        className="chip mb-sm border-outline-variant/40 bg-surface-variant/40 text-on-surface-variant"
        data-reveal
      >
        {eyebrow}
      </span>
      <AnimatedText className="mb-sm font-headline-md text-headline-md text-primary">
        {title}
      </AnimatedText>
      {subtitle && (
        <p className="mx-auto max-w-2xl text-on-surface-variant" data-reveal>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Question dépliable dont la réponse glisse au lieu d'apparaître d'un bloc.
 *
 * L'élément `details` reste la source de vérité pour l'accessibilité ; la
 * fermeture est simplement différée le temps de l'animation.
 */
function FaqItem({ question, answer }) {
  const detailsRef = useRef(null);
  const panelRef = useRef(null);

  const handleToggle = (event) => {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel || prefersReducedMotion()) return;

    event.preventDefault();

    if (details.open) {
      animate(panel, {
        height: [panel.scrollHeight, 0],
        opacity: [1, 0],
        duration: DURATION.base,
        ease: EASE.inOut,
        onComplete: () => {
          details.open = false;
          utils.set(panel, { height: "auto", opacity: 1 });
        },
      });
      return;
    }

    details.open = true;
    animate(panel, {
      height: [0, panel.scrollHeight],
      opacity: [0, 1],
      duration: DURATION.base,
      ease: EASE.out,
      onComplete: () => utils.set(panel, { height: "auto" }),
    });
  };

  return (
    <details
      ref={detailsRef}
      data-reveal
      className="group rounded-lg border border-outline-variant/30 bg-surface-container-low px-md py-sm"
    >
      <summary
        onClick={handleToggle}
        className="flex cursor-pointer list-none items-center justify-between gap-sm py-xs font-headline-sm text-primary marker:content-none"
      >
        <span style={{ fontSize: "18px" }}>{question}</span>
        <Icon
          name="chevron_right"
          className="shrink-0 text-on-surface-variant transition-transform duration-300 group-open:rotate-90"
        />
      </summary>
      <div ref={panelRef} className="overflow-hidden">
        <p className="pb-sm pt-xs text-on-surface-variant">{answer}</p>
      </div>
    </details>
  );
}

export default function Landing() {
  const authenticated = Boolean(getToken());
  const { hash } = useLocation();
  const assetCountRef = useCountUp(142);
  const heroRef = useRef(null);
  const heroGridRef = useRef(null);

  // La trame du hero derive moins vite que le contenu : le defilement gagne en
  // profondeur sans que le texte ne se decale de sa grille de lecture.
  useLayoutEffect(() => {
    const grid = heroGridRef.current;
    const hero = heroRef.current;
    if (!grid || !hero || prefersReducedMotion()) return undefined;

    const parallax = animate(grid, {
      y: [0, 180],
      scale: [1, 1.12],
      ease: "linear",
      autoplay: onScroll({ target: hero, sync: true }),
    });

    return () => parallax.revert();
  }, []);

  // Le navigateur ne peut pas cibler l'ancre : la section n'existe pas encore
  // au moment ou l'URL est lue par le routeur.
  useEffect(() => {
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [hash]);

  const primaryCta = authenticated
    ? { to: "/launch", label: "Lancer un audit" }
    : { to: "/signup", label: "Lancer un premier audit" };

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-background antialiased">
      <Reveal
        as="header"
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-gutter backdrop-blur-md"
      >
        <Link to="/" className="flex items-center" data-reveal aria-label="ƉEƉE - Accueil">
          <img
            src="/logo.png"
            alt="ƉEƉE Cybersecurity"
            width={500}
            height={145}
            className="h-9 w-auto object-contain"
          />
        </Link>

        <nav className="hidden gap-md lg:flex" data-reveal>
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

        <div className="flex items-center gap-sm" data-reveal>
          <ThemeToggle />
          {!authenticated && (
            <Link
              to="/signup"
              className="hidden text-on-surface-variant transition-colors hover:text-primary sm:block"
            >
              Créer un compte
            </Link>
          )}
          <Link
            to={authenticated ? "/launch" : "/login"}
            className="rounded border border-primary-container px-sm py-xs text-primary-container transition-all duration-200 hover:bg-primary-container hover:text-on-primary"
          >
            {authenticated ? "Lancer un audit" : "Connexion"}
          </Link>
        </div>
      </Reveal>

      <main className="flex-grow pt-16">
        {/* Hero : le paradigme agents au premier plan */}
        <section
          ref={heroRef}
          className="relative flex min-h-[820px] items-center overflow-hidden px-gutter py-xl"
        >
          <div ref={heroGridRef} className="tech-grid absolute inset-0 z-0" />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-background/90" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-lg lg:grid-cols-2">
            <Reveal className="flex flex-col items-start gap-lg text-left">
              <div
                className="inline-flex items-center gap-xs rounded-pill border border-primary-container/30 bg-surface-variant/50 px-sm py-xs font-label-caps text-label-caps uppercase text-primary-container"
                data-reveal
              >
                <span className="h-2 w-2 animate-pulse rounded-pill bg-primary-container" />
                Une équipe d'agents, pas un simple scanner
              </div>

              <AnimatedText
                as="h1"
                delay={200}
                className="max-w-2xl font-display-lg text-display-lg text-primary"
              >
                L'audit cybersécurité orchestré par des agents IA
              </AnimatedText>

              <p
                className="max-w-xl font-body-lg text-body-lg text-on-surface-variant"
                data-reveal
              >
                Un orchestrateur déploie des agents spécialisés contre votre
                surface exposée, mesure le risque et livre un plan de correction
                lisible. Vous suivez chaque agent en direct.
              </p>

              <div className="mt-md flex flex-col gap-sm sm:flex-row" data-reveal>
                <Link
                  to={primaryCta.to}
                  className="outer-glow-accent rounded border border-primary-container bg-primary-container/10 px-lg py-sm font-bold text-primary-container transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:text-on-primary"
                >
                  {primaryCta.label}
                </Link>
                <a
                  href="#agents"
                  className="rounded border border-outline-variant px-lg py-sm text-on-surface transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-variant"
                >
                  Voir l'équipe en action
                </a>
              </div>

              <div className="mt-lg grid w-full grid-cols-1 gap-sm border-t border-outline-variant/30 pt-lg sm:grid-cols-2">
                {HERO_HIGHLIGHTS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-sm text-left text-on-surface-variant"
                    data-reveal
                  >
                    <Icon name={item.icon} size={18} className="text-primary-container" />
                    <span className="font-label-caps text-label-caps uppercase">{item.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={180} className="relative">
              <div className="pointer-events-none absolute -inset-6 z-0 rounded-3xl bg-primary-container/10 blur-3xl" />
              <div className="relative z-10" data-reveal>
                <AgentTeamShowcase />
              </div>
            </Reveal>
          </div>
        </section>

        {/* L'équipe d'agents */}
        <section id="agents" className="scroll-mt-16 bg-surface-container-lowest px-gutter py-xl">
          <Reveal className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Le paradigme"
              title="Une équipe d'agents, chacun son métier"
              subtitle="L'orchestrateur pilote, les spécialistes exécutent, l'analyste consolide. Chaque étape est visible et auditable."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
              {AGENT_ROLES.map((role, index) => (
                <div
                  key={role.title}
                  className="relative flex flex-col rounded-lg border border-outline-variant/30 bg-surface-container-low p-md transition-all duration-200 hover:-translate-y-1 hover:border-primary-container/40"
                  data-reveal
                >
                  <div className="mb-sm flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded border border-primary-container/30 bg-primary-container/10 text-primary-container">
                      <Icon name={role.icon} size={20} />
                    </span>
                    <span className="font-display-lg text-[28px] leading-none text-outline-variant/40">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mb-xs font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                    {role.title}
                  </h3>
                  <p className="text-[14px] leading-6 text-on-surface-variant">{role.text}</p>
                </div>
              ))}

              <div
                className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-primary-container/40 bg-surface-container-low p-md"
                data-reveal
              >
                <div className="tech-grid absolute inset-0 opacity-40" />
                <div className="relative z-10">
                  <div className="mb-sm flex items-center gap-sm">
                    <Icon name="assessment" className="text-primary-container" />
                    <h3 className="font-headline-sm text-primary" style={{ fontSize: "18px" }}>
                      Rapport consolidé
                    </h3>
                  </div>
                  <p className="text-[14px] leading-6 text-on-surface-variant">
                    Chaque agent rend compte de son travail : le rapport final n'est
                    pas une boîte noire, mais la synthèse d'une exécution que vous
                    avez suivie pas à pas.
                  </p>
                  <div className="mt-sm rounded border border-outline-variant/50 bg-surface p-sm font-data-mono text-data-mono text-secondary-fixed-dim">
                    <AnimatedText as="p" mode="type">
                      &gt; audit --domaine exemple.tg --agents
                    </AnimatedText>
                    <p>
                      [+] <span ref={assetCountRef}>142</span> actifs exposés identifiés
                    </p>
                    <p>
                      [+] Corrélation des résultats par l'orchestrateur
                      <span className="animate-pulse">...</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Démarche */}
        <section id="demarche" className="scroll-mt-16 bg-surface px-gutter py-xl">
          <Reveal className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Démarche"
              title="Quatre étapes, du domaine au plan d'action"
              subtitle="Un parcours pensé pour des équipes qui n'ont ni le temps ni les moyens d'un audit manuel."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="relative flex flex-col rounded-lg border border-outline-variant/30 bg-surface-container-low p-md transition-colors hover:border-primary-container/40"
                  data-reveal
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
          </Reveal>
        </section>

        {/* Contenu du rapport */}
        <section className="bg-surface-container-lowest px-gutter py-xl">
          <Reveal className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Livrable"
              title="Ce que vous recevez à la fin d'un audit"
              subtitle="Un rapport exploitable par une équipe technique comme par une direction."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              {REPORT_CONTENT.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-md rounded-lg border border-outline-variant/30 bg-surface-container-low p-md transition-colors hover:border-primary-container/40"
                  data-reveal
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
          </Reveal>
        </section>

        {/* Engagements */}
        <section className="bg-surface px-gutter py-xl">
          <Reveal className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Engagements"
              title="Un audit encadré, jamais subi"
              subtitle="La sécurité d'une plateforme d'audit se juge d'abord à ce qu'elle s'interdit de faire."
            />

            <div className="grid grid-cols-1 gap-md md:grid-cols-3">
              {COMMITMENTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-md transition-colors hover:border-primary-container/40"
                  data-reveal
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
          </Reveal>
        </section>

        {/* Offre */}
        <section id="offre" className="scroll-mt-16 bg-surface-container-lowest px-gutter py-xl">
          <Reveal className="mx-auto max-w-4xl text-center">
            <SectionHeading
              eyebrow="Offre"
              title="Une offre simple pour les PME"
              subtitle="Tout ce qu'il faut pour sécuriser votre infrastructure, sans complexité."
            />

            <div
              className="outer-glow-accent relative mx-auto max-w-md rounded-lg border border-primary-container/50 bg-surface-container-low p-lg"
              data-reveal
            >
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
                className="block w-full rounded border border-primary-container bg-primary-container/10 py-sm font-bold text-primary-container transition-colors hover:bg-primary-container hover:text-on-primary"
              >
                {authenticated ? "Lancer un audit" : "Commencer"}
              </Link>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 bg-surface px-gutter py-xl">
          <Reveal className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />

            <div className="space-y-sm">
              {FAQ.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* Appel final */}
        <section className="px-gutter pb-xl">
          <div className="tech-grid relative mx-auto max-w-5xl overflow-hidden rounded-lg border border-primary-container/30 bg-surface-container-low px-md py-lg text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-low/80" />
            <Reveal className="relative z-10 flex flex-col items-center gap-sm">
              <AnimatedText className="font-headline-md text-headline-md text-primary">
                Votre équipe d'agents n'attend qu'un domaine
              </AnimatedText>
              <p className="max-w-2xl text-on-surface-variant" data-reveal>
                Lancez un premier audit et regardez les agents travailler en direct
                sur votre surface exposée.
              </p>
              <Link
                to={primaryCta.to}
                className="mt-sm rounded border border-primary-container bg-primary-container/10 px-lg py-sm font-bold text-primary-container transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:text-on-primary"
                data-reveal
              >
                {primaryCta.label}
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest px-gutter py-lg">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-1 gap-lg md:grid-cols-4">
          <div data-reveal>
            <div className="mb-sm">
              <img
                src="/logo.png"
                alt="ƉEƉE Cybersecurity"
                width={500}
                height={145}
                className="h-10 w-auto object-contain object-left"
              />
            </div>
            <p className="text-[14px] leading-5 text-on-surface-variant">
              Audits de cybersécurité orchestrés par une équipe d'agents IA pour les
              équipes techniques.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.title} data-reveal>
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
        </Reveal>

        <div className="mx-auto mt-lg max-w-7xl border-t border-outline-variant/30 pt-sm text-center text-[14px] text-on-surface-variant">
          © 2026 ƉEƉE. Sécurisé dès la conception.
        </div>
      </footer>
    </div>
  );
}
