import './LegalPages.css';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';

const sections = [
  {
    title: '1. Information We Collect',
    content:
      'We collect information you provide (account details, learning preferences, prompts), usage data (device, browser, IP, logs), and content generated through the platform. For paid plans, our payment processor collects billing details.',
  },
  {
    title: '2. How We Use Information',
    content:
      'We use data to deliver and personalize courses, generate audio/quiz content, improve product performance, provide support, process payments, and protect against fraud or abuse.',
  },
  {
    title: '3. Sharing & Disclosure',
    content:
      'We do not sell your data. We share limited data with service providers (hosting, analytics, payments) under confidentiality terms, and as required by law. AI providers may process prompts to return results; we restrict use to service delivery.',
  },
  {
    title: '4. Cookies & Tracking',
    content:
      'We use cookies and similar technologies to keep you signed in, remember preferences, and measure usage. You can adjust browser settings to limit cookies, but some features may not work.',
  },
  {
    title: '5. Data Retention',
    content:
      'We retain information while your account is active and as needed to provide the service. You may request deletion; some records may remain for legal, billing, or security purposes.',
  },
  {
    title: '6. Security',
    content:
      'We use administrative, technical, and physical safeguards to protect your information. No system is 100% secure; use strong passwords and protect your devices.',
  },
  {
    title: '7. Your Choices',
    content:
      'You can update profile information, manage marketing preferences, and request access or deletion of your data by contacting contact@Lowkeygenius.study. Verification may be required.',
  },
  {
    title: '8. International Transfers',
    content:
      'Your data may be processed in countries where we or our providers operate. We use appropriate safeguards when transferring data across borders.',
  },
  {
    title: '9. Children',
    content:
      'Lowkeygenius is not directed to children under 13 (or the minimum age in your jurisdiction). Do not use the service if you do not meet age requirements.',
  },
  {
    title: '10. Changes',
    content:
      'We may update this Privacy Policy periodically. Material changes will be communicated via the product or email. Continued use after changes indicates acceptance.',
  },
  {
    title: '11. Contact',
    content: 'For privacy questions or requests, contact contact@Lowkeygenius.study.',
  },
];

export function PrivacyPolicy() {
  return (
    <>
      <PublicHeader />
      <div className="legal-container">
        <div className="legal-card">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-intro">
            This Privacy Policy explains how Lowkeygenius collects, uses, and protects your information.
          </p>
          <div className="legal-sections">
            {sections.map((section) => (
              <section key={section.title} className="legal-section">
                <h2 className="legal-section-title">{section.title}</h2>
                <p className="legal-section-body">{section.content}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
