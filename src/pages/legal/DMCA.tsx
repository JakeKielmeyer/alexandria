{/* NON-LEGAL-ADVICE PLACEHOLDER — REVIEW WITH COUNSEL BEFORE LAUNCH */}
import React from 'react'
import LegalShell from '../../components/LegalShell'

export default function DMCA(): React.JSX.Element {
  return (
    <LegalShell title="Copyright / DMCA Policy" effective="April 20, 2026">
      <h2>Overview</h2>
      <p>
        Alexandria respects the intellectual property rights of others and
        expects its users to do the same. We respond to properly submitted
        notices under the United States Digital Millennium Copyright Act
        ("DMCA") and take appropriate action against repeat infringers.
      </p>

      <h2>Filing a notice of alleged infringement</h2>
      <p>
        To report allegedly infringing content, send a written notice to our
        Designated Agent that includes all of the following (per 17 U.S.C.
        § 512(c)(3)):
      </p>
      <ol>
        <li>A physical or electronic signature of the rights holder or authorized agent;</li>
        <li>Identification of the copyrighted work claimed to have been infringed;</li>
        <li>Identification of the allegedly infringing material and its URL on Alexandria;</li>
        <li>Your name, address, telephone number, and email address;</li>
        <li>A statement that you have a good-faith belief that the use is not authorized by the rights holder, its agent, or the law;</li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the rights holder.</li>
      </ol>

      <h2>Designated Agent</h2>
      <p>
        <strong>Address and registered agent to be finalized before public
        launch.</strong> Notices received at the email below during the private
        beta will be processed manually:
      </p>
      <p>
        <strong>Email:</strong> <a href="mailto:dmca@alexandria.invalid">dmca@alexandria.invalid</a>
      </p>

      <h2>Counter-notification</h2>
      <p>
        If your content was removed and you believe the removal was in error
        or misidentification, you may file a counter-notice under 17 U.S.C.
        § 512(g)(3). The counter-notice must include:
      </p>
      <ol>
        <li>Your physical or electronic signature;</li>
        <li>Identification of the removed material and its location before removal;</li>
        <li>A statement under penalty of perjury that you have a good-faith belief the material was removed as a result of mistake or misidentification;</li>
        <li>Your name, address, telephone number, and consent to jurisdiction in the federal district court where your address is located (or, if outside the U.S., any district where Alexandria may be found), and that you will accept service of process from the party who submitted the original notice.</li>
      </ol>

      <h2>Repeat-infringer policy</h2>
      <p>
        Accounts that are the subject of repeated good-faith infringement
        notices will be terminated at Alexandria's discretion in accordance
        with the DMCA safe-harbor requirements.
      </p>

      <h2>Misrepresentations</h2>
      <p>
        Under Section 512(f), any person who knowingly materially
        misrepresents that material is infringing, or that it was removed by
        mistake, may be liable for damages. Consider consulting an attorney
        before filing.
      </p>
    </LegalShell>
  )
}
