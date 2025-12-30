import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "@/components/verify/WelcomeStep";
import DocumentStep from "@/components/verify/DocumentStep";
import SelfieStep from "@/components/verify/SelfieStep";
import ResultsStep from "@/components/verify/ResultsStep";
import ConsentModal from "@/components/verify/ConsentModal";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { api, SessionState } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type VerificationData = {
  guestName: string;
  roomNumber: string;
  sessionToken?: string;
  documentImage?: string;
  selfieImage?: string;
  verificationScore?: number;
  isVerified?: boolean;
  livenessScore?: number;
  faceMatchScore?: number;
  consentGiven?: boolean;
  consentTime?: string;
};

type SessionStatus = 'loading' | 'found' | 'expired' | 'new';

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showConsent, setShowConsent] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
    consentGiven: false,
  });

  // Determine step from session state
  const inferStepFromSession = (session: SessionState): number => {
    // If current_step is provided, use it
    if (session.current_step) {
      if (typeof session.current_step === 'number') {
        return session.current_step;
      }
      const stepMap: Record<string, number> = {
        welcome: 1,
        document: 2,
        selfie: 3,
        results: 4,
      };
      return stepMap[session.current_step] || 1;
    }

    // Infer from flags
    if (session.is_verified !== undefined || session.verification_score !== undefined) {
      return 4; // Results
    }
    if (session.selfie_uploaded) {
      return 4; // Results (selfie done means we should show results)
    }
    if (session.document_uploaded) {
      return 3; // Selfie step
    }
    if (session.guest_name && session.room_number) {
      return 2; // Document step
    }
    return 1; // Welcome step
  };

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      // If token is 'new', start fresh
      if (!token || token === 'new') {
        setSessionStatus('new');
        setShowConsent(true);
        return;
      }

      // Try to restore existing session
      console.log('[Verify] Attempting to restore session:', token);
      const session = await api.getSession(token);

      if (session) {
        console.log('[Verify] Session restored:', session);
        const restoredStep = inferStepFromSession(session);
        
        setData({
          guestName: session.guest_name || "",
          roomNumber: session.room_number || "",
          sessionToken: session.session_token,
          consentGiven: session.consent_given,
          verificationScore: session.verification_score,
          livenessScore: session.liveness_score,
          faceMatchScore: session.face_match_score,
          isVerified: session.is_verified,
        });
        setStep(restoredStep);
        setSessionStatus('found');
        setShowConsent(false);
      } else {
        console.log('[Verify] Session not found or expired');
        setSessionStatus('expired');
      }
    };

    restoreSession();
  }, [token]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  const handleRetry = () => {
    setStep(1);
    setData({ guestName: "", roomNumber: "" });
  };

  const updateData = (newData: Partial<VerificationData>) => {
    setData({ ...data, ...newData });
  };

  const handleConsent = (sessionToken: string) => {
    setShowConsent(false);
    setSessionStatus('found');
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
    });
  };

  const handleConsentCancel = () => {
    navigate("/");
  };

  const handleError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "An error occurred. Please try again.",
      variant: "destructive",
    });
  };

  // Loading state
  if (sessionStatus === 'loading') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-white/80">Loading session...</p>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  // Session expired state
  if (sessionStatus === 'expired') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 text-center max-w-md"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏰</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session Expired</h2>
            <p className="text-white/70 mb-6">
              This verification session has expired or is no longer available. Please start a new verification.
            </p>
            <Link to="/verify/new">
              <Button className="w-full bg-white text-primary hover:bg-white/90">
                Start Over
              </Button>
            </Link>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      {showConsent && (
        <ConsentModal onConsent={handleConsent} onCancel={handleConsentCancel} />
      )}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-2xl">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6"
          >
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      step >= num
                        ? "bg-white text-primary"
                        : "bg-white/20 text-white/50"
                    }`}
                  >
                    {num}
                  </div>
                  {num < 4 && (
                    <div
                      className={`hidden md:block w-16 h-1 mx-2 transition-all duration-300 ${
                        step > num ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep
                key="welcome"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onError={handleError}
              />
            )}
            {step === 2 && (
              <DocumentStep
                key="document"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}
            {step === 3 && (
              <SelfieStep
                key="selfie"
                data={data}
                updateData={updateData}
                onNext={handleNext}
                onBack={handleBack}
                onError={handleError}
              />
            )}
            {step === 4 && (
              <ResultsStep
                key="results"
                data={data}
                onRetry={handleRetry}
                onHome={() => navigate("/")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
