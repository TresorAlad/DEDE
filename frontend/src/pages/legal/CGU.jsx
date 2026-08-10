import LegalLayout from "../../components/LegalLayout";

export default function CGU() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="8 août 2026">
      <section className="space-y-sm">
          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">1. Objet</h2>
          <p>
            Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation de la
            plateforme ƉEƉE (ci-après « la Plateforme »), un service d'audit de sécurité automatisé
            destiné à identifier les vulnérabilités et les failles de configuration exposées publiquement
            sur les domaines et sous-domaines d'une organisation.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">2. Description du service</h2>
          <p>
            La Plateforme permet à un utilisateur de déclarer une plateforme web lui appartenant, d'en
            vérifier la propriété, puis de lancer un audit automatisé combinant plusieurs outils open
            source (découverte de sous-domaines, détection de vulnérabilités connues, analyse du
            chiffrement HTTPS, vérification des en-têtes de sécurité HTTP) et une analyse par
            intelligence artificielle qui synthétise les résultats et propose des recommandations. Un
            assistant conversationnel permet également d'interroger les résultats d'un audit.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">3. Autorisation d'audit et responsabilité de l'utilisateur</h2>
          <p>
            L'utilisateur s'engage à n'ajouter à la Plateforme que des domaines et plateformes dont il est
            propriétaire ou pour lesquels il dispose d'une autorisation explicite d'audit de sécurité.
            Toute déclaration frauduleuse d'un domaine engage la seule responsabilité de son auteur.
            La procédure de vérification de propriété mise en place par la Plateforme constitue une
            mesure de contrôle raisonnable mais ne dispense pas l'utilisateur de cette obligation.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">4. Nature des audits réalisés</h2>
          <p>
            Les audits réalisés par la Plateforme sont exclusivement passifs ou non intrusifs : ils
            observent, interrogent ou analysent des informations déjà exposées publiquement, sans
            tentative d'exploitation active des vulnérabilités détectées. La Plateforme ne réalise aucun
            test d'intrusion offensif au sens strict.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">5. Limites du service</h2>
          <p>
            La Plateforme est fournie dans le cadre d'un projet réalisé lors d'un hackathon. Elle
            constitue un produit minimum viable et ne garantit pas l'exhaustivité de la détection des
            vulnérabilités. Les résultats et recommandations générés, y compris ceux produits par
            l'intelligence artificielle, sont fournis à titre indicatif et ne remplacent pas un audit de
            sécurité professionnel approfondi.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">6. Compte utilisateur</h2>
          <p>
            L'utilisateur est responsable de la confidentialité de ses identifiants de connexion et de
            toute activité réalisée depuis son compte. Il s'engage à fournir des informations exactes
            lors de son inscription.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">7. Propriété intellectuelle</h2>
          <p>
            La Plateforme s'appuie sur des composants open source tiers, distribués sous leurs
            licences respectives, ainsi que sur des services d'intelligence artificielle tiers. Le
            code, l'interface et les contenus propres à ƉEƉE demeurent la propriété de ses auteurs.
            La liste des composants utilisés est communiquée sur demande.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">8. Modification des CGU</h2>
          <p>
            Les présentes conditions peuvent être modifiées à tout moment. Les utilisateurs seront
            informés de toute modification substantielle.
          </p>

          <h2 className="pt-sm font-headline-sm text-[18px] leading-6 text-primary">9. Contact</h2>
          <p>
            Pour toute question relative aux présentes conditions, contactez l'équipe du projet ƉEƉE via
            les canaux de communication indiqués sur la Plateforme.
          </p>
      </section>
    </LegalLayout>
  );
}
