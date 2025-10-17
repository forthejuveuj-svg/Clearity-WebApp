import { Check, Star, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const navigate = useNavigate();
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const selectedPlan = localStorage.getItem("selectedPlan") || "Monthly";

  const pricingPlans = [
    {
      name: "Monthly",
      price: "$9.99",
      period: "per month",
      icon: Zap,
      gradient: "from-blue-500 to-purple-500",
      features: [
        "Unlimited overthinking sessions",
        "Advanced mind mapping",
        "Priority support",
        "Export your thoughts"
      ],
      description: "Perfect for getting started"
    },
    {
      name: "Annually",
      price: "$99",
      period: "per year",
      icon: Star,
      gradient: "from-purple-500 to-pink-500",
      features: [
        "All Monthly benefits, better price",
        "2 months free",
        "Early access to features",
        "Premium templates",
        "Advanced analytics"
      ],
      description: "Best value - save 17%",
      popular: true
    },
    {
      name: "Founding Membership",
      price: "$149",
      period: "one-time",
      icon: Crown,
      gradient: "from-yellow-500 to-orange-500",
      features: [
        "Everything in Annually",
        "Lifetime access",
        "Exclusive community",
        "Direct founder access",
        "Custom integrations",
        "VIP support"
      ],
      description: "Only 20 slots available"
    }
  ];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-black via-gray-950 to-black overflow-hidden flex items-center justify-center fixed inset-0">
      <div className="container mx-auto px-6 max-h-screen overflow-y-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            <span 
              className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ffffff, #f3f4f6, #e5e7eb, #f3f4f6, #ffffff)',
                backgroundSize: '300% 300%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }}
            >
              Your Overthinking Journey Starts Here
            </span>
          </h1>
          
          {/* AI Credits remaining - below title */}
          <div className="inline-block px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-full mb-3">
            <p className="text-red-300 text-sm font-medium">
              AI Credits: <span className="text-red-400 font-semibold">10/30</span> remaining
            </p>
          </div>
          <p className="text-white/50 text-xs mt-1">
            Credits refresh daily • 3 days left in trial
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
          {pricingPlans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                  plan.popular 
                    ? 'border-white/20 shadow-xl shadow-white/5' 
                    : 'border-white/10 hover:border-white/15'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-medium text-white mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-xs mb-3">{plan.description}</p>
                  
                  <div className="mb-3">
                    <span className="text-4xl font-light text-white">{plan.price}</span>
                    <span className="text-white/50 ml-2 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <span className="text-white/70 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (isPaidUser && plan.name === selectedPlan) {
                      // If this is the current plan, do nothing or navigate to settings
                      navigate("/settings");
                    } else {
                      // Set user as paid and navigate to main app
                      localStorage.setItem("isPaidUser", "true");
                      localStorage.setItem("selectedPlan", plan.name);
                      navigate("/app");
                    }
                  }}
                  className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-300 ${
                    isPaidUser && plan.name === selectedPlan
                      ? 'bg-gray-600 hover:bg-gray-700 text-white cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/20'
                      : plan.name === 'Founding Membership'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/20'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/20'
                  }`}
                >
                  {isPaidUser && plan.name === selectedPlan ? 'Current' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white transition-colors duration-300 text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
