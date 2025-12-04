import './LegalPages.css';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using Progent, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the service.',
  },
  {
    title: '2. Service Description',
    content:
      'Progent is an AI-powered learning platform that creates personalized courses, lessons, quizzes, flashcards, and audio content based on user inputs and preferences.',
  },
  {
    title: '3. Eligibility',
    content:
      'You must be at least 13 years old (or the minimum age in your jurisdiction) to use Progent. By using the service, you represent that you meet these requirements and have legal authority to enter into this agreement.',
  },
  {
    title: '4. Accounts & Security',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.',
  },
  {
    title: '5. Payments & Subscriptions',
    content:
      'Paid plans and add-ons (including audio generation) may be billed on a recurring basis. Prices, inclusions, and billing terms are shown at checkout. Taxes may apply. You can cancel anytime, but fees already paid are nonrefundable unless required by law.',
  },
  {
    title: '6. Content & License',
    content:
      'You retain ownership of content you provide. You grant Progent a worldwide, non-exclusive license to use, reproduce, and process your content solely to operate and improve the service. AI-generated outputs are provided “as is” for your personal or internal use.',
  },
  {
    title: '7. Acceptable Use',
    content:
      'Do not misuse the service, reverse engineer, scrape, interfere with operation, or use generated content to violate laws, IP rights, or platform policies. Automated abuse, fraudulent activity, and competing commercial use are prohibited.',
  },
  {
    title: '8. Privacy',
    content:
      'Your use of Progent is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect your information.',
  },
  {
    title: '9. Disclaimers',
    content:
      'The service and AI outputs are provided “as is” without warranties of any kind. We do not guarantee accuracy, completeness, or fitness for a particular purpose. Use generated content at your own discretion.',
  },
  {
    title: '10. Limitation of Liability',
    content:
      'To the fullest extent permitted by law, Progent is not liable for indirect, incidental, special, consequential, or punitive damages, or any loss of data or profits arising from your use of the service.',
  },
  {
    title: '11. Termination',
    content:
      'We may suspend or terminate access for violations of these terms or to protect the service. You may stop using the service at any time; certain obligations survive termination.',
  },
  {
    title: '12. Changes',
    content:
      'We may update these terms from time to time. Material changes will be communicated via the product or email. Continued use after changes constitutes acceptance.',
  },
  {
    title: '13. Contact',
    content: 'For questions about these Terms, contact us at contact@progent.study.',
  },
];

export function TermsOfService() {
  return (
    <>
      <PublicHeader />
      <div className="legal-container">
        <div className="legal-card">
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-intro">
            Welcome to Progent. These Terms of Service govern your use of the platform.
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
