import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-orange-100 rounded-full">
            <XCircle className="w-16 h-16 text-orange-600" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Checkout Cancelled
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          No worries! Your checkout was cancelled and you haven't been charged.
          You can return to pricing anytime you're ready to upgrade.
        </p>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">What You're Missing</h2>
          </div>
          <ul className="text-left space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Create multiple courses every month with AI assistance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Generate comprehensive lesson content automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Optional audio generation for learning on the go</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Priority support and advanced features</span>
            </li>
          </ul>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/pricing')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="secondary"
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Have questions? Contact our support team anytime.
        </p>
      </Card>
    </div>
  );
}
