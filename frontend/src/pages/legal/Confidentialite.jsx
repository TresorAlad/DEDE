import LegalLayout from "../../components/LegalLayout";

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="8 août 2026">
      <section className="space-y-sm">
          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">1. Données collectées</h2>
          <p>La Plateforme collecte les données suivantes :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Données de compte : nom de l'organisation, nom et prénom du contact, adresse email, mot de passe (stocké sous forme hachée, jamais en clair).</li>
            <li>Données relatives aux plateformes auditées : nom, domaine, URL, statut de vérification de propriété.</li>
            <li>Résultats d'audit : données brutes issues des outils de scan, analyses générées par l'intelligence artificielle, scores de sécurité et recommandations.</li>
            <li>Historique des échanges avec l'assistant conversationnel, dans la limite du contexte d'un audit.</li>
          </ul>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">2. Finalités du traitement</h2>
          <p>
            Ces données sont utilisées exclusivement pour permettre la création et la gestion du compte,
            la réalisation des audits de sécurité demandés, la génération des rapports et des
            recommandations, ainsi que l'amélioration du service.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">3. Sous-traitants et services tiers</h2>
          <p>
            Certaines données brutes issues des audits sont transmises à un fournisseur tiers
            d'intelligence artificielle afin de générer une synthèse et des recommandations
            en langage naturel. Les données de compte et les résultats d'audit sont stockés dans une base
            de données PostgreSQL hébergée par un fournisseur cloud tiers. Aucune donnée n'est vendue à
            des tiers à des fins commerciales.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">4. Durée de conservation</h2>
          <p>
            Les données de compte et les résultats d'audit sont conservés tant que le compte de
            l'utilisateur est actif. L'utilisateur peut demander la suppression de son compte et de
            l'ensemble des données associées à tout moment.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">5. Sécurité des données</h2>
          <p>
            L'accès à la Plateforme est protégé par authentification (mot de passe haché, jetons de
            session signés). Les échanges entre le navigateur et le serveur sont chiffrés. L'accès aux
            résultats d'un audit est strictement limité au compte propriétaire de la plateforme auditée.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">6. Droits des utilisateurs</h2>
          <p>
            Conformément à la réglementation applicable en matière de protection des données
            personnelles, chaque utilisateur dispose d'un droit d'accès, de rectification, d'opposition et
            de suppression de ses données. Ces droits peuvent être exercés en contactant l'équipe du
            projet ƉEƉE via les canaux indiqués sur la Plateforme.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">7. Cookies et traceurs</h2>
          <p>
            La Plateforme utilise uniquement les éléments strictement nécessaires à l'authentification
            (jeton de session stocké côté client). Aucun cookie publicitaire ou de traçage tiers n'est
            utilisé.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">8. Contact</h2>
          <p>
            Pour toute question relative à la présente politique ou à l'exercice de vos droits, contactez
            l'équipe du projet ƉEƉE via les canaux de communication indiqués sur la Plateforme.
          </p>
      </section>
    </LegalLayout>
  );
}
