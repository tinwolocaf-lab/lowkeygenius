import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
            <div className="relative p-4 bg-green-100 rounded-full">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your New Plan!
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Your subscription has been activated successfully. You now have access to all the features
          of your selected plan.
        </p>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Getting Started</h2>
          </div>
          <ul className="text-left space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[24px]">1.</span>
              <span>Head to your dashboard to see your subscription details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[24px]">2.</span>
              <span>Start creating amazing courses with AI-powered tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[24px]">3.</span>
              <span>Explore all the features available in your plan</span>
            </li>
          </ul>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => navigate('/onboarding')}
            variant="secondary"
          >
            Create First Course
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>
      </Card>
    </div>
  );
}
