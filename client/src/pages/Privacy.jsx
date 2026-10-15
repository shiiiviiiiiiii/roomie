export default function Privacy() {
  return (
    <div className="container legal">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: <strong>[TODO: insert date]</strong></p>

      <h2>1. Who we are</h2>
      <p>
        This policy explains how <strong>[TODO: legal entity name]</strong>
        (&ldquo;Roomie&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and protects your personal
        data when you use our room and flatmate marketplace in India.
      </p>
      <p>
        Contact our data team: <strong>[TODO: privacy contact email]</strong>.
        Our grievance officer under applicable Indian law: <strong>[TODO: name and email of grievance officer]</strong>.
      </p>

      <h2>2. Legal basis — India&apos;s DPDP Act, 2023</h2>
      <p>
        We process your personal data in line with the Digital Personal Data
        Protection Act, 2023 (DPDP Act) and its rules. In general terms: we collect
        data only for the specific, lawful purposes described below, we ask for your
        consent where the law requires it (for example, before sending marketing
        messages), and we honour your rights over your data as set out in section 9.
      </p>

      <h2>3. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, password (stored as a one-way hash), phone number, gender, occupation and bio, as provided by you.</li>
        <li><strong>Listing data:</strong> property details, photos, rent and location information you publish.</li>
        <li><strong>Usage data:</strong> chats you send through the platform, visit requests, saved homes, reports you file, and notification preferences.</li>
        <li><strong>Technical data:</strong> IP address, device and browser information, and pages visited, collected automatically for security and analytics.</li>
      </ul>

      <h2>4. How we use your data</h2>
      <ul>
        <li>To operate your account, display your listings and deliver core features (search, chat, visit requests, alerts).</li>
        <li>To keep the platform safe: detecting fraud, spam and abuse, and moderating reported content.</li>
        <li>To communicate with you about your account, security notices and (with consent) product updates.</li>
        <li>To understand aggregate usage and improve the service.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Sharing</h2>
      <ul>
        <li><strong>With other users:</strong> information you choose to make public — your name, listing details, photos and profile fields — is visible to other users as needed for the marketplace to function. Your email address and password hash are never shown to other users.</li>
        <li><strong>Service providers:</strong> hosting, storage and (once configured) email/SMS/push providers, bound by contract to use data only to provide their service.</li>
        <li><strong>Legal:</strong> where required by Indian law or a lawful order, or to protect safety and our legal rights.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        We use cookies as described in our <a href="/cookies">Cookie Policy</a>.
        Necessary cookies keep you signed in and the site secure; optional
        categories (preferences, analytics, marketing) are only used with your
        consent, which you can change at any time via &ldquo;Cookie settings&rdquo; in the footer.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We keep your data only as long as needed for the purposes above: account
        data for the life of your account, listings until you delete them (or your
        account), and technical logs for up to <strong>[TODO: retention period, e.g. 12 months]</strong>.
        When you delete your account we remove or anonymise your personal data,
        except where the law requires us to retain certain records.
      </p>

      <h2>8. Security</h2>
      <p>
        We use reasonable technical and organisational safeguards — encrypted
        transport (HTTPS), hashed passwords, access controls and rate limiting —
        but no internet service is completely secure. Use a strong, unique password
        and tell us immediately if you suspect misuse of your account.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Under the DPDP Act you have rights over your personal data, including the
        right to access a summary of the data we hold about you, to correct or
        complete it, to request its erasure, to withdraw consent where processing
        is based on consent, and to seek grievance redressal. To exercise any of
        these, email <strong>[TODO: privacy contact email]</strong>; we will
        respond within the timelines the law requires.
      </p>

      <h2>10. Children</h2>
      <p>
        Roomie is for users aged 18 and over. We do not knowingly collect data from
        children; accounts found to belong to under-18s will be removed.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy as the law or our practices evolve. Material
        changes will be highlighted in the app before they take effect.
      </p>
    </div>
  );
}
