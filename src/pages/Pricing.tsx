import { Check, Star, Crown, Zap, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Pricing = () => {
  const navigate = useNavigate();
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const selectedPlan = localStorage.getItem("selectedPlan") || "Monthly";
  const [selectedTab, setSelectedTab] = useState<"monthly" | "annually">("monthly");
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    subscription: "monthly",
    willingToPay: "",
    reason: "",
    location: "",
    workStudy: "",
    whatsapp: ""
  });

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

  const getPriceForSubscription = (subscription: string) => {
    if (subscription === "monthly") return "$9.99";
    if (subscription === "annually") return "$99";
    if (subscription === "founding") return "$149";
    return "";
  };

  const getPlaceholderForSubscription = (subscription: string) => {
    if (subscription === "monthly") return "e.g. $7";
    if (subscription === "annually") return "e.g. $70";
    if (subscription === "founding") return "e.g. $120";
    return "e.g. $7";
  };

  const handleDiscountFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Discount request submitted:", discountForm);
    // Here you would typically send this to your backend
    setIsDiscountFormOpen(false);
    setIsConfirmationModalOpen(true);
    setDiscountForm({
      subscription: "monthly",
      willingToPay: "",
      reason: "",
      location: "",
      workStudy: "",
      whatsapp: ""
    });
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

        {/* Footer - Discount Request Link */}
        <div className="text-center mt-12 mb-8">
          <button
            onClick={() => setIsDiscountFormOpen(true)}
            className="text-white/50 hover:text-white/80 text-sm underline transition-all duration-300"
          >
            Can't afford the full price?
          </button>
        </div>
      </div>

      {/* Discount Request Modal */}
      {isDiscountFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Request a Discount</h2>
              <button
                onClick={() => setIsDiscountFormOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDiscountFormSubmit} className="p-6 space-y-6">
              {/* Subscription Choice */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Which subscription do you want to choose?
                </label>
                <select
                  value={discountForm.subscription}
                  onChange={(e) => setDiscountForm({ ...discountForm, subscription: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="monthly">Monthly - $9.99/month</option>
                  <option value="annually">Annually - $99/year</option>
                  <option value="founding">Founding Membership - $149 lifetime</option>
                </select>
              </div>

              {/* Willing to Pay */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  How much are you willing to pay?
                  <span className="text-white/50 ml-2">
                    (Original price: {getPriceForSubscription(discountForm.subscription)})
                  </span>
                </label>
                <input
                  type="text"
                  value={discountForm.willingToPay}
                  onChange={(e) => setDiscountForm({ ...discountForm, willingToPay: e.target.value })}
                  placeholder={getPlaceholderForSubscription(discountForm.subscription)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Why should we give a discount specifically for you?
                </label>
                <textarea
                  value={discountForm.reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                  placeholder="Tell us your story..."
                  rows={4}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Where do you live now?
                </label>
                <input
                  type="text"
                  value={discountForm.location}
                  onChange={(e) => setDiscountForm({ ...discountForm, location: e.target.value })}
                  placeholder="City, Country"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Work/Study */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Where do you work/study?
                </label>
                <input
                  type="text"
                  value={discountForm.workStudy}
                  onChange={(e) => setDiscountForm({ ...discountForm, workStudy: e.target.value })}
                  placeholder="Company or University name"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  WhatsApp number
                </label>
                <input
                  type="tel"
                  value={discountForm.whatsapp}
                  onChange={(e) => setDiscountForm({ ...discountForm, whatsapp: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDiscountFormOpen(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-base bg-gray-800 hover:bg-gray-700 text-white border border-white/10 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-medium text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-300"
                >
                  Request a discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-white/20 rounded-3xl max-w-md w-full p-8 shadow-2xl shadow-purple-500/10 animate-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-6 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              We will consider your request within 24 hours
            </h3>

            {/* Message */}
            <div className="space-y-3 mb-6">
              
              {/* Calendly CTA */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                <p className="text-white/70 text-sm text-center mb-2">
                  💡 <span className="font-medium text-white">Increase your chances</span>
                </p>
                <a
                  href="https://calendly.com/forthejuveuj/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-blue-400 hover:text-blue-300 font-medium transition-colors underline underline-offset-2"
                >
                  Talk to a founder →
                </a>
              </div>
            </div>

            {/* OK Button */}
            <button
              onClick={() => setIsConfirmationModalOpen(false)}
              className="w-full py-3 rounded-xl font-medium text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
