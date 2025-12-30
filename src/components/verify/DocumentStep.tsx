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

const DocumentStep = ({ data, updateData, onNext, onBack, onError }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCapture = (imageData: string) => {
    console.log('✅ DocumentStep.handleCapture called!');
    console.log('📄 Document captured, full data length:', imageData?.length);
    console.log('📄 Document data format:', imageData?.substring(0, 50));
    
    // Verify it's JPEG format
    if (!imageData?.startsWith('data:image/jpeg;base64,')) {
      console.warn('⚠️ Image is not JPEG format:', imageData?.substring(0, 30));
    }
    
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    console.log('🔄 Retaking photo');
    setCapturedImage(null);
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;
    
    console.log('📄 Confirming upload, raw image length:', capturedImage?.length);
    console.log('📄 Raw image format:', capturedImage?.substring(0, 50));
    
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
    console.log('🚀 Starting upload process...');
    console.log('🔑 Session token:', data.sessionToken);
    
    try {
      const requestBody = {
        action: 'upload_document',
        session_token: data.sessionToken,
        image_data: cleanBase64,
        document_type: 'passport',
        guest_name: data.guestName,
        room_number: data.roomNumber
      };
      
      console.log('📤 Sending document upload request:', {
        action: requestBody.action,
        session_token: requestBody.session_token,
        document_type: requestBody.document_type,
        image_data_length: cleanBase64?.length || 0,
        image_data_preview: cleanBase64?.substring(0, 50)
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
      console.log('📦 Response data:', responseData);

      if (responseData.success) {
        console.log('✅ Upload successful!');
        updateData({ documentImage: capturedImage });
        toast({ title: "Document uploaded successfully!" });
        onNext();
      } else {
        console.log('❌ Upload failed:', responseData.error);
        throw new Error(responseData.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('💥 Upload error:', error);
      toast({
        title: "Failed to upload document",
        description: (error as Error).message,
        variant: "destructive"
      });
      onError(error as Error);
    } finally {
      console.log('🏁 Upload process finished');
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
        {t('document.back')}
      </Button>

      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t('document.title')}
      </h2>
      <p className="text-white/80 text-center mb-8">
        {t('document.instruction')}
      </p>

      {isProcessing ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white text-xl">{t('document.uploading')}</p>
        </div>
      ) : capturedImage ? (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
            <img 
              src={capturedImage} 
              alt="Captured document" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleRetake}
              variant="glass"
              className="flex-1"
            >
              {t('document.retake')}
            </Button>
            <Button
              onClick={handleConfirmUpload}
              variant="glass"
              className="flex-1"
            >
              {t('document.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <CameraCapture
          onCapture={handleCapture}
          facingMode="environment"
          overlayType="document"
        />
      )}
    </motion.div>
  );
};

export default DocumentStep;
