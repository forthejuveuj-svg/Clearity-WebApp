import { Check, Star, Crown, Zap, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Pricing = () => {
  const navigate = useNavigate();
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const selectedPlan = localStorage.getItem("selectedPlan") || "Monthly";
  const [selectedTab, setSelectedTab] = useState<"monthly" | "annually">("monthly");

  const subscriptionPlans = {
    monthly: {
      name: "Monthly",
      price: "$9.99",
      period: "per month",
      icon: Zap,
      gradient: "from-blue-500 to-purple-500",
      features: [
        "Unlimited overthinking sessions",
        "Export from other apps",
        "Requesting and upvoting features"
      ],
      description: ""
    },
    annually: {
      name: "Annually",
      price: "$99",
      period: "per year",
      icon: Star,
      gradient: "from-purple-500 to-pink-500",
      features: [
        "Unlimited overthinking sessions",
        "Export from other apps",
        "Requesting and upvoting features"
      ],
      description: "",
      popular: true
    }
  };

  const foundingMembership = {
    name: "Founding Membership",
    price: "$149",
    period: "lifetime",
    icon: Crown,
    gradient: "from-yellow-500 to-orange-500",
    features: [
      "All benefits from annual",
      "Lifetime access",
      "Exclusive community",
      "Direct founder access",
      "Custom integrations",
      "VIP support"
    ],
    description: "Only 20 slots available"
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-black via-gray-950 to-black overflow-hidden flex items-center justify-center fixed inset-0">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl text-white transition-all duration-300 hover:scale-105"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      
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
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          {/* Subscription Plan with Tabs */}
          <div className="relative bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] flex flex-col border-white/10 hover:border-white/15">
            {/* Tabs */}
            <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setSelectedTab("monthly")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTab === "monthly"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedTab("annually")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTab === "annually"
                    ? "bg-purple-500 text-white shadow-lg"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Annually
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  selectedTab === "annually"
                    ? "bg-white/20 text-white"
                    : "bg-green-600/80 text-green-100"
                }`}>
                  Save 20%
                </span>
              </button>
            </div>

            {/* Plan Content */}
            {(() => {
              const plan = subscriptionPlans[selectedTab];
              const IconComponent = plan.icon;
              return (
                <>
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
                        navigate("/settings");
                      } else {
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
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {isPaidUser && plan.name === selectedPlan ? 'Current' : 'Get Started'}
                  </button>
                </>
              );
            })()}
          </div>

          {/* Founding Membership */}
          <div className="relative bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] flex flex-col border-white/10 hover:border-white/15">
            <div className="text-center mb-6">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${foundingMembership.gradient} flex items-center justify-center shadow-lg`}>
                <Crown className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-medium text-white mb-1">{foundingMembership.name}</h3>
              <p className="text-white/50 text-xs mb-3">{foundingMembership.description}</p>
              
              <div className="mb-3">
                <span className="text-4xl font-light text-white">{foundingMembership.price}</span>
                <span className="text-white/50 ml-2 text-sm">{foundingMembership.period}</span>
              </div>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {foundingMembership.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <span className="text-white/70 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                if (isPaidUser && foundingMembership.name === selectedPlan) {
                  navigate("/settings");
                } else {
                  localStorage.setItem("isPaidUser", "true");
                  localStorage.setItem("selectedPlan", foundingMembership.name);
                  navigate("/app");
                }
              }}
              className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-300 ${
                isPaidUser && foundingMembership.name === selectedPlan
                  ? 'bg-gray-600 hover:bg-gray-700 text-white cursor-default'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/20'
              }`}
            >
              {isPaidUser && foundingMembership.name === selectedPlan ? 'Current' : 'Get Started'}
            </button>
          </div>
        </div>

        {/* Footer */}
      </div>
    </div>
  );
};

export default Pricing;
