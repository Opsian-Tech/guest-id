import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import CameraCapture from "@/components/CameraCapture";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onBack: () => void;
  onError: (error: Error) => void;
};

const SelfieStep = ({ data, updateData, onNext, onBack, onError }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCapture = (imageData: string) => {
    console.log('✅ SelfieStep.handleCapture called!');
    console.log('📸 Selfie captured, full data length:', imageData?.length);
    console.log('📸 Selfie data format:', imageData?.substring(0, 50));
    
    // Verify it's JPEG format
    if (!imageData?.startsWith('data:image/jpeg;base64,')) {
      console.warn('⚠️ Image is not JPEG format:', imageData?.substring(0, 30));
    }
    
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    console.log('🔄 Retaking selfie');
    setCapturedImage(null);
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;
    
    console.log('📸 Confirming upload, raw image length:', capturedImage?.length);
    console.log('📸 Raw image format:', capturedImage?.substring(0, 50));
    
    if (!data.sessionToken) {
      onError(new Error('No session token found'));
      return;
    }

    // Strip the data URI prefix to get clean base64
    let cleanBase64 = capturedImage;
    if (capturedImage.startsWith('data:image/jpeg;base64,')) {
      cleanBase64 = capturedImage.replace('data:image/jpeg;base64,', '');
      console.log('✂️ Stripped data URI prefix, clean base64 length:', cleanBase64.length);
      console.log('✂️ Clean base64 preview:', cleanBase64.substring(0, 50));
    } else {
      console.warn('⚠️ Image does not have expected JPEG data URI prefix');
    }

    setIsProcessing(true);
    console.log('🚀 Starting selfie upload process...');
    console.log('🔑 Session token:', data.sessionToken);
    
    try {
      const requestBody = {
        action: 'verify_face',
        session_token: data.sessionToken,
        selfie_data: cleanBase64,
        image_data: cleanBase64,
      };
      
      console.log('📤 Sending selfie verification request:', {
        action: requestBody.action,
        session_token: requestBody.session_token,
        selfie_data_length: cleanBase64?.length || 0,
        selfie_data_preview: cleanBase64?.substring(0, 50)
      });

      console.log('🌐 Making fetch request...');
      const response = await fetch('https://roomquest-id-backend.vercel.app/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      const responseData = await response.json();
      console.log('📦 Full Response data:', JSON.stringify(responseData, null, 2));

      // Check if verification was successful (handle both response formats)
      const isSuccess = responseData.success || responseData.is_verified;
      const verificationData = responseData.data || responseData;
      
      console.log('🔍 verificationData:', JSON.stringify(verificationData, null, 2));
      console.log('🔍 verificationData.details:', JSON.stringify(verificationData.details, null, 2));
      
      // Extract scores from the correct location in the response
      const details = verificationData.details || verificationData;
      const livenessScore = details.liveness_score || verificationData.liveness_score;
      const faceMatchScore = details.face_match_score || verificationData.face_match_score;
      const verificationScore = details.verification_score || verificationData.verification_score;
      
      console.log('📊 Extracted scores:', {
        livenessScore,
        faceMatchScore,
        verificationScore,
        isVerified: verificationData.is_verified
      });

      // Always update scores, even on failure
      updateData({
        selfieImage: capturedImage,
        livenessScore,
        faceMatchScore,
        verificationScore,
        isVerified: verificationData.is_verified,
      });

      if (isSuccess && verificationData.is_verified) {
        console.log('✅ Verification successful!');
        toast({ title: "Identity verified!" });
        onNext();
      } else {
        console.log('❌ Verification failed:', responseData.error);
        toast({ title: "Verification complete - check results" });
        onNext();
      }
    } catch (error) {
      console.error('💥 Verification error:', error);
      toast({
        title: "Failed to verify identity",
        description: (error as Error).message,
        variant: "destructive"
      });
      onError(error as Error);
    } finally {
      console.log('🏁 Verification process finished');
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
