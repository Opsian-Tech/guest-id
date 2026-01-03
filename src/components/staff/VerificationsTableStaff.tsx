import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionRow } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
type FilterStatus = "all" | "verified" | "failed" | "pending";
interface VerificationsTableStaffProps {
  sessions: SessionRow[];
}
const VerificationsTableStaff = ({
  sessions
}: VerificationsTableStaffProps) => {
  const { t } = useTranslation();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t('staff.table.justNow');
    if (diffMins < 60) return t('staff.table.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('staff.table.hoursAgo', { count: diffHours });
    return t('staff.table.daysAgo', { count: diffDays });
  };
  const getStatusBadge = (session: SessionRow) => {
    if (session.verification_score >= 0.7) {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
          {t('staff.table.verified')}
        </Badge>;
    } else if (session.verification_score > 0) {
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
          {t('staff.table.failed')}
        </Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
        {t('staff.table.pending')}
      </Badge>;
  };
  const getStatus = (session: SessionRow): FilterStatus => {
    if (session.verification_score >= 0.7) return "verified";
    if (session.verification_score > 0) return "failed";
    return "pending";
  };
  const filteredSessions = sessions.filter(session => {
    const statusMatch = filterStatus === "all" || getStatus(session) === filterStatus;
    if (!selectedDate) return statusMatch;
    const sessionDate = new Date(session.created_at);
    const dateMatch = sessionDate.getDate() === selectedDate.getDate() && sessionDate.getMonth() === selectedDate.getMonth() && sessionDate.getFullYear() === selectedDate.getFullYear();
    return statusMatch && dateMatch;
  });
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="glass rounded-2xl p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl text-white font-poppins font-thin">{t('staff.todayVerifications')}</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button onClick={() => exportToCSV(filteredSessions, "roomquest_verifications")} variant="outline" size="sm" className="glass border-white/20 text-white hover:bg-white/20">
            <Download className="w-4 h-4 mr-2" />
            {t('staff.table.exportCSV')}
          </Button>
          <Button onClick={() => exportToPDF(filteredSessions, "roomquest_verifications")} variant="outline" size="sm" className="glass border-white/20 text-white hover:bg-white/20">
            <FileText className="w-4 h-4 mr-2" />
            {t('staff.table.exportPDF')}
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto ml-auto">
          <Select value={filterStatus} onValueChange={value => setFilterStatus(value as FilterStatus)}>
            <SelectTrigger className="glass border-white/20 text-white w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all">{t('staff.table.showAll')}</SelectItem>
              <SelectItem value="verified">{t('staff.table.verifiedOnly')}</SelectItem>
              <SelectItem value="failed">{t('staff.table.failedOnly')}</SelectItem>
              <SelectItem value="pending">{t('staff.table.pendingOnly')}</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="glass border-white/20 text-white hover:bg-white/20 w-full sm:w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "MMM dd, yyyy") : t('staff.table.pickDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/20">
              <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/80">{t('staff.table.guestName')}</TableHead>
              <TableHead className="text-white/80">{t('staff.table.roomNumber')}</TableHead>
              <TableHead className="text-white/80">{t('staff.table.status')}</TableHead>
              <TableHead className="text-white/80">{t('staff.table.score')}</TableHead>
              <TableHead className="text-white/80">{t('staff.table.time')}</TableHead>
              <TableHead className="text-white/80">{t('staff.table.details')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? <TableRow>
                <TableCell colSpan={6} className="text-center text-white/60 py-8">
                  {t('staff.table.noVerifications')}
                </TableCell>
              </TableRow> : filteredSessions.map(session => <>
                  <TableRow key={session.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="text-white font-medium">
                      {session.guest_name}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {session.room_number}
                    </TableCell>
                    <TableCell>{getStatusBadge(session)}</TableCell>
                    <TableCell className="text-white/80">
                      {session.verification_score > 0 ? `${(session.verification_score * 100).toFixed(0)}%` : t('staff.table.na')}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatTime(session.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedRow(expandedRow === session.id ? null : session.id)} className="text-white/80 hover:text-white hover:bg-white/10">
                        {expandedRow === session.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  <AnimatePresence>
                    {expandedRow === session.id && <TableRow className="border-white/10">
                        <TableCell colSpan={6} className="p-0">
                          <motion.div initial={{
                    height: 0,
                    opacity: 0
                  }} animate={{
                    height: "auto",
                    opacity: 1
                  }} exit={{
                    height: 0,
                    opacity: 0
                  }} transition={{
                    duration: 0.2
                  }} className="overflow-hidden">
                            <div className="p-6 bg-white/5 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/10 rounded-lg p-4">
                                  <p className="text-white/60 text-sm mb-1">
                                    {t('staff.table.livenessScore')}
                                  </p>
                                  <p className="text-white text-xl font-bold">
                                    {t('staff.table.na')}
                                  </p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-4">
                                  <p className="text-white/60 text-sm mb-1">
                                    {t('staff.table.faceMatchScore')}
                                  </p>
                                  <p className="text-white text-xl font-bold">
                                    {t('staff.table.na')}
                                  </p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-4">
                                  <p className="text-white/60 text-sm mb-1">
                                    {t('staff.table.documentStatus')}
                                  </p>
                                  <p className="text-white text-xl font-bold">
                                    {session.is_verified ? t('staff.table.verified') : t('staff.table.pending')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>}
                  </AnimatePresence>
                </>)}
          </TableBody>
        </Table>
      </div>
    </motion.div>;
};
export default VerificationsTableStaff;