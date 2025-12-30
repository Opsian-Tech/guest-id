import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationData } from "@/pages/Verify";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onError: (error: Error) => void;
};

const WelcomeStep = ({ data, updateData, onNext, onError }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data.guestName || !data.roomNumber) {
      return;
    }

    if (!data.sessionToken) {
      toast({ 
        title: "Session error", 
        description: "No session token found. Please restart.",
        variant: "destructive"
      });
      return;
    }

    // Just proceed to next step - guest info will be sent with document upload
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-8 md:p-12"
    >
      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t('welcome.title')}
      </h2>
      <p className="text-white/80 text-center mb-8">
        {t('welcome.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="guestName" className="text-white text-lg">
            {t('welcome.guestName')}
          </Label>
          <Input
            id="guestName"
            type="text"
            placeholder={t('welcome.guestNamePlaceholder')}
            value={data.guestName}
            onChange={(e) => updateData({ guestName: e.target.value })}
            className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roomNumber" className="text-white text-lg">
            {t('welcome.roomNumber')}
          </Label>
          <Input
            id="roomNumber"
            type="text"
            placeholder={t('welcome.roomNumberPlaceholder')}
            value={data.roomNumber}
            onChange={(e) => updateData({ roomNumber: e.target.value })}
            className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          variant="glass"
          className="w-full h-14 text-lg font-bold"
        >
          {isLoading ? t('welcome.starting') : t('welcome.startVerification')}
        </Button>
      </form>
    </motion.div>
  );
};

export default WelcomeStep;
