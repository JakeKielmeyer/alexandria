{/* NON-LEGAL-ADVICE PLACEHOLDER — REVIEW WITH COUNSEL BEFORE LAUNCH */}
import React from 'react'
import LegalShell from '../../components/LegalShell'

export default function Privacy(): React.JSX.Element {
  return (
    <LegalShell title="Privacy Policy" effective="April 20, 2026">
      <h2>1. Scope</h2>
      <p>
        This Privacy Policy explains what information Alexandria collects,
        how we use it, and the choices you have. It applies to the web
        application at this domain and any subdomains we operate.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data.</strong> Email address, chosen username,
          password hash, and display profile fields you provide.
        </li>
        <li>
          <strong>Content data.</strong> Stories, panels, layers, and media
          assets you upload, along with publication and transition settings.
        </li>
        <li>
          <strong>Operational data.</strong> IP address, user agent,
          timestamps, and request metadata used to secure the platform and
          diagnose errors.
        </li>
        <li>
          <strong>Error reports.</strong> If crash reporting is enabled, a
          sanitized stack trace and environment metadata are sent to our
          error-tracking vendor.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide the platform's core features (authoring, hosting, reading);</li>
        <li>To authenticate users and prevent abuse;</li>
        <li>To communicate service-related updates;</li>
        <li>To comply with legal obligations and respond to valid legal process.</li>
      </ul>
      <p>
        We do not sell personal information. We do not run behavioral
        advertising.
      </p>

      <h2>4. Where your data lives</h2>
      <p>
        Account records and story metadata are stored on <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
        (Postgres). Media assets are stored on Supabase Storage and may, in
        the future, be served via Cloudflare infrastructure. The web
        application is hosted on <a href="https://pages.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare Pages</a>.
        Optional crash reports, if you do not opt out, are sent to Sentry.
      </p>

      <h2>5. Cookies and local storage</h2>
      <p>
        Alexandria uses cookies and local storage strictly for authentication
        (keeping you signed in) and storing non-identifying UI preferences.
        We do not use third-party advertising cookies.
      </p>

      <h2>6. Data retention</h2>
      <p>
        Account and content data are retained while your account is active.
        When you delete your account, we remove your personal profile and
        your unpublished content within a reasonable period, subject to
        backup propagation. Published content may persist for archival
        purposes in de-identified form where law permits.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct, port, or delete your personal information, and to object to
        or restrict certain processing. Contact <a href="mailto:privacy@alexandria.invalid">privacy@alexandria.invalid</a>
        to exercise these rights. We will verify identity before acting.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Our infrastructure providers may process data in jurisdictions
        different from yours. By using the platform you acknowledge this
        processing. Specific transfer safeguards (e.g., SCCs) will be
        documented before public launch.
      </p>

      <h2>9. Children</h2>
      <p>
        Alexandria is not directed to children. We do not knowingly collect
        information from users under 18. See the <a href="/terms">Terms of Service</a> for age restrictions.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy. Material changes will be
        communicated via the platform or email. The effective date above
        reflects the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:privacy@alexandria.invalid">privacy@alexandria.invalid</a>.
      </p>
    </LegalShell>
  )
}
