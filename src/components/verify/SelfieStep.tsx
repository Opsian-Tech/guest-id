import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import CameraCapture from "@/components/CameraCapture";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { optimizeImageWithGuardrails } from "@/lib/image";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onNextGuest: () => void;
  onBack: () => void;
  onError: (error: Error) => void;
};

const SelfieStep = ({ data, updateData, onNext, onNextGuest, onBack, onError }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCapture = (imageData: string) => {
    console.log("[Selfie] Image captured");
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    console.log("[Selfie] Retaking photo");
    setCapturedImage(null);
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;

    if (!data.sessionToken) {
      onError(new Error("No session token found"));
      return;
    }

    setIsProcessing(true);
    console.log("[Selfie] Starting verification process...");

    try {
      // Optimize image before upload
      const optimizeResult = await optimizeImageWithGuardrails(capturedImage);

      if (!optimizeResult.success) {
        const errorResult = optimizeResult as { success: false; errorMessage: string };
        toast({
          title: "Image too large",
          description: errorResult.errorMessage,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      console.log(`[Selfie] Optimized size: ${Math.round(optimizeResult.sizeBytes / 1024)}KB`);

      // Strip the data URI prefix to get clean base64
      const cleanBase64 = optimizeResult.dataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );

      console.log("[Selfie] Sending verification request...");

      const response = await api.verify({
        action: "verify_face",
        session_token: data.sessionToken,
        selfie_data: cleanBase64,
        image_data: cleanBase64,
      });

      // Check if verification was successful (handle both response formats)
      const isSuccess = response.success || response.is_verified;
      const responseData = response.data;

      // Extract scores defensively from flat fields or nested data
      const livenessScore = responseData?.liveness_score ?? response.liveness_score;
      const faceMatchScore = responseData?.face_match_score ?? response.face_match_score;
      const verificationScore = responseData?.verification_score ?? response.verification_score;
      const isVerified = responseData?.is_verified ?? response.is_verified;

      // Extract multi-guest fields from response
      const guestVerified = response.guest_verified ?? false;
      const requiresAdditionalGuest = response.requires_additional_guest ?? false;
      const verifiedGuestCount = response.verified_guest_count;
      const expectedGuestCount = response.expected_guest_count;
      const guestIndex = response.guest_index;

      console.log("[Selfie] Scores:", { livenessScore, faceMatchScore, verificationScore });
      console.log("[Selfie] Multi-guest:", { guestVerified, requiresAdditionalGuest, verifiedGuestCount, expectedGuestCount, guestIndex });

      // Always update scores and multi-guest state
      updateData({
        selfieImage: optimizeResult.dataUrl,
        livenessScore,
        faceMatchScore,
        verificationScore,
        isVerified,
        guestVerified,
        requiresAdditionalGuest,
        verifiedGuestCount,
        expectedGuestCount,
        guestIndex,
      });

      // ROUTING LOGIC: Check guest_verified FIRST
      if (!guestVerified) {
        // Case 1: THIS guest failed verification - stay on selfie screen
        console.log("[Selfie] Guest verification failed, allowing retake");
        toast({
          title: t('selfie.verificationFailed'),
          description: t('selfie.retakeSelfie'),
          variant: "destructive",
        });
        setCapturedImage(null); // Allow retake
        return; // Do NOT advance
      }

      if (requiresAdditionalGuest) {
        // Case 2: Guest verified, more guests needed - loop back to document step
        console.log("[Selfie] Guest verified, additional guest required, looping back to document step");
        toast({ 
          title: t('selfie.guestVerified', { 
            verified: verifiedGuestCount || 1,
            next: (verifiedGuestCount || 1) + 1 
          })
        });
        onNextGuest();
      } else {
        // Case 3: All guests verified - go to results
        console.log("[Selfie] All guests verified, proceeding to results");
        toast({ title: t('selfie.identityVerified') });
        onNext();
      }
    } catch (error) {
      console.error("[Selfie] Verification error:", error);
      toast({
        title: "Failed to verify identity",
        description: (error as Error).message,
        variant: "destructive",
      });
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-8 md:p-12"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-white hover:bg-white/20 mb-4"
        disabled={isProcessing}
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        {t('selfie.back')}
      </Button>

      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t('selfie.title')}
      </h2>
      <p className="text-white/80 text-center mb-8">
        {t('selfie.instruction')}
      </p>

      {isProcessing ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white text-xl">{t('selfie.verifying')}</p>
          <p className="text-white/70 text-lg mt-2">{t('selfie.processingTM30')}</p>
        </div>
      ) : capturedImage ? (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
            <img 
              src={capturedImage} 
              alt="Captured selfie" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleRetake}
              variant="glass"
              className="flex-1"
            >
              {t('selfie.retake')}
            </Button>
            <Button
              onClick={handleConfirmUpload}
              variant="glass"
              className="flex-1"
            >
              {t('selfie.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <CameraCapture
          onCapture={handleCapture}
          facingMode="user"
          overlayType="face"
        />
      )}
    </motion.div>
  );
};

export default SelfieStep;
