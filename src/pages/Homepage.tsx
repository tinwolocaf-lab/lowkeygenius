import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Headphones, ArrowRight, CheckCircle2, Target, Brain, Layers, Share2 } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AnimatedCourseDemo } from '../components/AnimatedCourseDemo';

export function Homepage() {
  const navigate = useNavigate();
  const [isVideoInView, setIsVideoInView] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVideoInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Continuous Learning Memory',
      description: 'Progent remembers what you have learned. If you know JavaScript, it wont teach you the basics again when you learn React.',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Deep Dive, Not Just Summaries',
      description: 'Unlike chat bots that summarize, Progent expands topics into full courses with detailed steps, quizzes, and flashcards.',
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: 'Audio Mode',
      description: 'Turn any course into a podcast. Listen while driving or commuting and learn on the go.',
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'Structured Knowledge',
      description: 'A central place for all your learning. No more scattered notes across different platforms.',
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'Personalized Onboarding',
      description: 'We analyze your background (e.g., university major, work experience) to tailor content specifically for you.',
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: 'Share Your Journey',
      description: 'Share your generated courses and progress with others (Coming Soon).',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Tell Us About You',
      description: 'Complete a quick onboarding so AI understands your background and goals.',
    },
    {
      number: '02',
      title: 'Choose Your Topic',
      description: 'Select what you want to learn. We support everything from Programming to Marketing.',
    },
    {
      number: '03',
      title: 'Generate & Learn',
      description: 'Get a comprehensive, structured course. Read detailed lessons or listen in Audio Mode.',
    },
    {
      number: '04',
      title: 'Build Your Knowledge',
      description: 'Progent tracks your progress and adapts future courses based on what you already know.',
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
      question: 'How is this different from ChatGPT or NotebookLM?',
      answer: 'ChatGPT and NotebookLM are great for summarizing or answering quick questions. Progent is designed for deep, systematic learning. It generates entire structured courses with lessons, quizzes, and progress tracking, rather than just short answers.',
    },
    {
      question: 'Does it really remember what I learned?',
      answer: 'Yes! Progent builds a knowledge graph of your learning. If you take a course on "Programming Basics", it wont repeat those concepts when you generate a "Advanced Python" course.',
    },
    {
      question: 'Can I listen to courses?',
      answer: 'Absolutely. Our Audio Mode converts lessons into natural-sounding audio, perfect for learning while driving, exercising, or commuting.',
    },
    {
      question: 'Is the content personalized?',
      answer: 'Highly personalized. If you have a background in Marketing, and you want to learn Coding, we use analogies and examples that make sense to a Marketer.',
    },
    {
      question: 'Can I export my courses?',
      answer: 'Yes, all courses can be exported in markdown format for use in other tools or platforms.',
    },
    {
      question: 'How long does it take to generate a course?',
      answer: 'Course outlines generate in seconds. Individual lessons take 1-2 minutes each. A complete course is typically ready in under 10 minutes.',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-surface">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-neutral-surface py-12 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center">
            <div className="text-center lg:text-left order-2 lg:order-1 flex flex-col justify-center">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-text mb-6 leading-tight">
                Your Central Place for
                <br />
                <span className="text-primary">Continuous Growth</span>
              </h1>

              <p className="font-body text-xl text-neutral-text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
                Stop learning from scattered sources. Progent is the professional agent that helps you create courses, learn independently, and build a connected knowledge base using AI.
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

      {/* Feature Highlight: Continuous Memory */}
      <section className="py-20 bg-neutral-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div
                ref={videoRef}
                className="relative w-full max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 aspect-[9/16] sm:aspect-[3/4]"
              >
                {!isVideoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full animate-pulse bg-neutral-300 dark:bg-neutral-700" />
                  </div>
                )}
                {isVideoInView && (
                  <video
                    src="/videos/Mascot_Animation_Video_Generation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedData={() => setIsVideoLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                )}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-6">
                It Remembers What You Know
              </h2>
              <p className="font-body text-lg text-neutral-text-muted mb-6 leading-relaxed">
                Most AI tools treat every session like a blank slate. Progent builds a <strong>Continuous Knowledge Graph</strong> of your learning.
              </p>
              <p className="font-body text-lg text-neutral-text-muted mb-6 leading-relaxed">
                If you've already learned <em>Python</em> with us, we won't waste your time explaining variables when you start a <em>Machine Learning</em> course. We build upon your existing knowledge, just like a real human tutor.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span className="font-body text-neutral-text">Smart prerequisite checking</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span className="font-body text-neutral-text">Cross-subject connections</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span className="font-body text-neutral-text">Personalized difficulty adjustment</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight: Audio Mode */}
      <section className="py-20 bg-neutral-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-text mb-6">
                Learn While You Move
              </h2>
              <p className="font-body text-lg text-neutral-text-muted mb-6 leading-relaxed">
                Don't have time to sit and read? Use <strong>Audio Mode</strong> to turn any lesson into an engaging podcast.
              </p>
              <p className="font-body text-lg text-neutral-text-muted mb-6 leading-relaxed">
                Perfect for commuting, driving, or exercising. Progent makes it easy to fit learning into your busy schedule.
              </p>
              <Button variant="primary" onClick={() => navigate('/signup')}>
                Try Audio Learning
              </Button>
            </div>
            <div>
              <img src="/images/feature-audio.png" alt="Audio Learning" className="rounded-3xl shadow-2xl w-full max-w-md mx-auto hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section id="features" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              More Than Just a Chatbot
            </h2>
            <p className="font-body text-xl text-neutral-text-muted max-w-2xl mx-auto">
              Progent is a complete learning platform designed for mastery, not just quick answers.
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

      <section id="how-it-works" className="py-20 sm:py-32 bg-primary/5">
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

      <section id="faq" className="py-20 sm:py-32 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-neutral-text mb-4">
              Frequently Asked Questions
            </h2>
            <p className="font-body text-xl text-neutral-text-muted">
              Everything you need to know about Progent
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
          <img src="/logo.png" alt="Progent" className="w-20 h-20 mx-auto mb-6 object-contain" />
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
                <div className="p-1">
                  <img src="/logo.png" alt="Progent" className="w-8 h-8 object-contain" />
                </div>
                <span className="font-display text-xl font-bold text-neutral-text">Progent</span>
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
            <p>&copy; {new Date().getFullYear()} Progent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
