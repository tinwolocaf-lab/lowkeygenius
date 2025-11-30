import { useNavigate } from 'react-router-dom';
import { GraduationCap, Sparkles, BookOpen, FileText, Headphones, ArrowRight, CheckCircle2, Clock, Target } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AnimatedCourseDemo } from '../components/AnimatedCourseDemo';

export function Homepage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'AI-Powered Generation',
      description: 'Create comprehensive courses on any topic using advanced AI technology that adapts to your learning style.',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Personalized Learning',
      description: 'Courses tailored to your background, experience level, and learning goals for maximum effectiveness.',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Rich Content',
      description: 'Get detailed lessons with code examples, exercises, and practical applications in markdown format.',
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: 'Audio Learning',
      description: 'Convert lessons to audio with AI-powered text-to-speech for learning on the go.',
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Course Management',
      description: 'Organize, track, and access all your courses from a beautiful, intuitive dashboard.',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Fast Generation',
      description: 'Generate complete course outlines and lessons in minutes, not weeks.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Choose Your Topic',
      description: 'Tell us what you want to learn and upload any reference materials.',
    },
    {
      number: '02',
      title: 'Personalize Your Course',
      description: 'Share your background and goals so AI can tailor the content perfectly.',
    },
    {
      number: '03',
      title: 'Generate & Learn',
      description: 'Get a complete course outline and lessons generated instantly.',
    },
    {
      number: '04',
      title: 'Track Your Progress',
      description: 'Take notes, export content, and learn at your own pace.',
    },
  ];

  const pricingTiers = [
    { name: 'Free', price: '0', courses: '1 course', popular: false },
    { name: 'Plus', price: '10', courses: '5 courses/month', popular: true },
    { name: 'Pro', price: '20', courses: '30 courses/month', popular: false },
    { name: 'Pro Max', price: '40', courses: 'Unlimited', popular: false },
  ];

  const faqs = [
    {
      question: 'How does the AI course generation work?',
      answer: 'Our AI analyzes your topic, learning goals, and background to create a structured course outline with detailed lessons. It uses advanced language models to generate comprehensive, accurate content tailored to your needs.',
    },
    {
      question: 'Can I use my own materials?',
      answer: 'Yes! You can upload PDFs, documents, URLs, or paste text. The AI will incorporate your materials into the course structure and reference them in lessons.',
    },
    {
      question: 'What topics can I create courses on?',
      answer: 'Any topic! From programming and data science to cooking, languages, business, art, and more. The AI adapts to create appropriate content for any subject.',
    },
    {
      question: 'Can I export my courses?',
      answer: 'Yes, all courses can be exported in markdown format for use in other tools or platforms.',
    },
    {
      question: 'How long does it take to generate a course?',
      answer: 'Course outlines generate in seconds. Individual lessons take 1-2 minutes each. A complete course is typically ready in under 10 minutes.',
    },
    {
      question: 'What makes this different from other learning platforms?',
      answer: 'Unlike pre-made courses, LearnSelfAI creates completely personalized courses tailored to your specific background, goals, and learning style. You get exactly what you need to learn, not generic content.',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-surface">
      <PublicHeader />

      <section className="relative overflow-hidden bg-neutral-surface py-12 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center">
            <div className="text-center lg:text-left order-2 lg:order-1 flex flex-col justify-center">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="inline-flex items-center gap-2 bg-neutral-bg backdrop-blur-sm px-6 py-3 rounded-full shadow-soft border border-neutral-border">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-body font-bold text-primary">AI-Powered Personalized Learning</span>
                </div>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-text mb-6 leading-tight">
                Learn Anything,
                <br />
                <span className="text-primary">Your Way</span>
              </h1>

              <p className="font-body text-lg sm:text-xl text-neutral-text-muted mb-8 max-w-xl mx-auto lg:mx-0">
                Create personalized AI-generated courses on any topic in minutes. Tailored to your background, goals, and learning style.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="flex items-center gap-2 text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all"
                >
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-lg px-8 py-4"
                >
                  See How It Works
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-neutral-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  <span className="font-body text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  <span className="font-body text-sm">Free course included</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  <span className="font-body text-sm">Cancel anytime</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
                <div className="relative">
                  <AnimatedCourseDemo />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10" />
      </section>

      <section id="features" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              Everything You Need to Learn
            </h2>
            <p className="font-body text-xl text-neutral-text-muted max-w-2xl mx-auto">
              Powerful features designed to make your learning journey effective and enjoyable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-all">
                <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-4 w-16 h-16 flex items-center justify-center mb-6 shadow-soft">
                  {feature.icon}
                </div>
                <h3 className="font-display text-2xl font-bold text-neutral-text mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-neutral-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-32 bg-primary-light/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              How It Works
            </h2>
            <p className="font-body text-xl text-neutral-text-muted max-w-2xl mx-auto">
              Get started in minutes with our simple four-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="p-8 h-full">
                  <div className="font-display text-6xl font-bold text-primary/20 mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-neutral-text mb-3">
                    {step.title}
                  </h3>
                  <p className="font-body text-neutral-text-muted leading-relaxed">
                    {step.description}
                  </p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 mx-auto"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="font-body text-xl text-neutral-text-muted max-w-2xl mx-auto">
              Choose the plan that fits your learning goals. Start free, upgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`p-8 relative ${tier.popular ? 'border-2 border-primary shadow-xl transform scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-1 rounded-full text-sm font-bold shadow-soft">
                    Most Popular
                  </div>
                )}
                <h3 className="font-display text-2xl font-bold text-neutral-text mb-2">
                  {tier.name}
                </h3>
                <div className="mb-4">
                  <span className="font-display text-5xl font-bold text-neutral-text">
                    ${tier.price}
                  </span>
                  <span className="text-neutral-text-muted">/month</span>
                </div>
                <p className="font-body text-neutral-text-muted mb-6">
                  {tier.courses}
                </p>
                <Button
                  variant={tier.popular ? 'primary' : 'secondary'}
                  className="w-full"
                  onClick={() => navigate('/signup')}
                >
                  Get Started
                </Button>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/pricing')}
              className="font-body text-primary font-bold hover:underline text-lg inline-flex items-center gap-2"
            >
              View Full Pricing Details
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 sm:py-32 bg-primary-light/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              Frequently Asked Questions
            </h2>
            <p className="font-body text-xl text-neutral-text-muted">
              Everything you need to know about LearnSelfAI
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="p-8">
                <h3 className="font-display text-xl font-bold text-neutral-text mb-3">
                  {faq.question}
                </h3>
                <p className="font-body text-neutral-text-muted leading-relaxed">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-6" />
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-6">
            Ready to Start Learning?
          </h2>
          <p className="font-body text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of learners creating personalized courses with AI. Start your first course free today.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/signup')}
            className="flex items-center gap-2 mx-auto"
          >
            Create Your Free Course
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      <footer className="bg-neutral-bg border-t border-neutral-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary rounded-xl p-2">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="font-display text-xl font-bold text-neutral-text">LearnSelfAI</span>
              </div>
              <p className="font-body text-neutral-text-muted text-sm">
                Personalized AI-powered learning for everyone.
              </p>
            </div>

            <div>
              <h4 className="font-display font-bold mb-4 text-neutral-text">Product</h4>
              <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
                <li><button onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">Features</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-neutral-text transition-colors">Pricing</button></li>
                <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">How It Works</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold mb-4 text-neutral-text">Support</h4>
              <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
                <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">FAQ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold mb-4 text-neutral-text">Legal</h4>
              <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
                <li><a href="#" className="hover:text-neutral-text transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-neutral-text transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-border pt-8 text-center font-body text-sm text-neutral-text-muted">
            <p>&copy; {new Date().getFullYear()} LearnSelfAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
