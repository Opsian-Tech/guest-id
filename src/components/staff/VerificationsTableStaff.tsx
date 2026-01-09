import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, ChevronUp, Calendar, Download, FileText, 
  CheckCircle2, AlertTriangle, FileJson, FileSpreadsheet 
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { exportTM30ToCSV, exportTM30ToJSON } from "@/lib/tm30ExportUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SessionRow } from "@/lib/api";
import { ExtendedSessionRow, TM30Data, getTM30ReadyStatus } from "@/types/tm30";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import TM30DetailsDrawer from "./TM30DetailsDrawer";

type FilterStatus = "all" | "verified" | "failed" | "pending";

interface VerificationsTableStaffProps {
  sessions: SessionRow[];
}

// Convert SessionRow to ExtendedSessionRow with simulated TM30 data
const toExtendedSession = (session: SessionRow): ExtendedSessionRow => {
  // TODO: Replace with actual backend data when available
  return {
    ...session,
    extracted_info: {
      // Simulated extracted data - would come from backend
      first_name: session.guest_name?.split(" ")[0] || null,
      middle_name: null,
      last_name: session.guest_name?.split(" ").slice(1).join(" ") || null,
      document_number: null,
      date_of_birth: null,
      date_of_issue: null,
      expiration_date: null,
      id_type: null,
      mrz_code: null,
      // Simulated confidence - would come from backend
      name_confidence: session.is_verified ? 0.95 : null,
      passport_confidence: session.is_verified ? 0.88 : null,
    },
    reservation: {
      check_in_time: null,
      check_out_date: null,
      property_name: "RoomQuest Hotel",
    },
    tm30: {
      nationality: null,
      sex: null,
      arrival_date_time: null,
      departure_date: null,
      property: "RoomQuest Hotel",
      room_number: session.room_number || null,
      notes: null,
    },
  };
};

const VerificationsTableStaff = ({ sessions }: VerificationsTableStaffProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Local TM30 state (TODO: Replace with backend persistence)
  const [tm30DataMap, setTm30DataMap] = useState<Record<string, TM30Data>>({});
  const [tm30ReadyMap, setTm30ReadyMap] = useState<Record<string, boolean>>({});

  // Convert sessions to extended sessions with local TM30 overrides
  const extendedSessions = useMemo(() => {
    return sessions.map(session => {
      const extended = toExtendedSession(session);
      if (tm30DataMap[session.id]) {
        extended.tm30 = { ...extended.tm30, ...tm30DataMap[session.id] };
      }
      return extended;
    });
  }, [sessions, tm30DataMap]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t("staff.table.justNow");
    if (diffMins < 60) return t("staff.table.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("staff.table.hoursAgo", { count: diffHours });
    return t("staff.table.daysAgo", { count: diffDays });
  };

  const getStatusBadge = (session: SessionRow) => {
    if (session.verification_score >= 0.7) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
          {t("staff.table.verified")}
        </Badge>
      );
    } else if (session.verification_score > 0) {
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
          {t("staff.table.failed")}
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
        {t("staff.table.pending")}
      </Badge>
    );
  };

  const getTM30StatusBadge = (session: ExtendedSessionRow) => {
    // Check if manually marked as ready
    if (tm30ReadyMap[session.id]) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          TM30 Ready
        </Badge>
      );
    }
    
    const { ready, missingFields } = getTM30ReadyStatus(session.tm30);
    if (ready) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          TM30 Ready
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Missing ({missingFields.length})
      </Badge>
    );
  };

  const getStatus = (session: SessionRow): FilterStatus => {
    if (session.verification_score >= 0.7) return "verified";
    if (session.verification_score > 0) return "failed";
    return "pending";
  };

  const filteredSessions = extendedSessions.filter((session) => {
    const statusMatch = filterStatus === "all" || getStatus(session) === filterStatus;
    if (!selectedDate) return statusMatch;
    const sessionDate = new Date(session.created_at);
    const dateMatch =
      sessionDate.getDate() === selectedDate.getDate() &&
      sessionDate.getMonth() === selectedDate.getMonth() &&
      sessionDate.getFullYear() === selectedDate.getFullYear();
    return statusMatch && dateMatch;
  });

  const readySessions = filteredSessions.filter((s) => {
    if (tm30ReadyMap[s.id]) return true;
    const { ready } = getTM30ReadyStatus(s.tm30);
    return ready;
  });

  const selectedReadySessions = filteredSessions.filter(
    (s) => selectedRows.has(s.id) && (tm30ReadyMap[s.id] || getTM30ReadyStatus(s.tm30).ready)
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const readyIds = readySessions.map((s) => s.id);
      setSelectedRows(new Set(readyIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSaveTM30 = (sessionId: string, tm30Data: TM30Data) => {
    // TODO: Replace with actual API call
    setTm30DataMap((prev) => ({ ...prev, [sessionId]: tm30Data }));
  };

  const handleMarkReady = (sessionId: string) => {
    // TODO: Replace with actual API call
    setTm30ReadyMap((prev) => ({ ...prev, [sessionId]: true }));
  };

  const handleBulkExport = (format: "csv" | "json") => {
    const toExport = selectedRows.size > 0 ? selectedReadySessions : readySessions;
    
    if (toExport.length === 0) {
      toast({
        title: "No Records",
        description: "No TM30 Ready records to export.",
        variant: "destructive",
      });
      return;
    }

    // Check if user selected non-ready rows
    if (selectedRows.size > 0 && selectedReadySessions.length < selectedRows.size) {
      toast({
        title: "Partial Export",
        description: `Only ${selectedReadySessions.length} TM30 Ready records will be exported (${selectedRows.size - selectedReadySessions.length} non-ready records skipped).`,
      });
    }

    if (format === "csv") {
      exportTM30ToCSV(toExport, "tm30_bulk_export");
    } else {
      exportTM30ToJSON(toExport, "tm30_bulk_export");
    }

    toast({
      title: "Exported",
      description: `${toExport.length} TM30 records exported as ${format.toUpperCase()}.`,
    });
  };

  const hasSelectedRows = selectedRows.size > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl text-white font-poppins font-thin">
          {t("staff.todayVerifications")}
        </h2>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button
            onClick={() => exportToCSV(sessions, "roomquest_verifications")}
            variant="outline"
            size="sm"
            className="glass border-white/20 text-white hover:bg-white/20"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("staff.table.exportCSV")}
          </Button>
          <Button
            onClick={() => exportToPDF(sessions, "roomquest_verifications")}
            variant="outline"
            size="sm"
            className="glass border-white/20 text-white hover:bg-white/20"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t("staff.table.exportPDF")}
          </Button>
        </div>
      </div>

      {/* Bulk TM30 Export Toolbar */}
      <AnimatePresence>
        {(hasSelectedRows || readySessions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedRows.size === readySessions.length && readySessions.length > 0}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                className="border-white/30 data-[state=checked]:bg-primary"
              />
              <span className="text-white/80 text-sm">
                {hasSelectedRows
                  ? `${selectedRows.size} selected (${selectedReadySessions.length} ready)`
                  : `Select all ready (${readySessions.length})`}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass border-white/20 text-white hover:bg-white/20"
                  disabled={readySessions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export TM30 (Ready only)
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-white/20">
                <DropdownMenuItem
                  onClick={() => handleBulkExport("csv")}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkExport("json")}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <FileJson className="w-4 h-4 mr-2" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto ml-auto">
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as FilterStatus)}
          >
            <SelectTrigger className="glass border-white/20 text-white w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all">{t("staff.table.showAll")}</SelectItem>
              <SelectItem value="verified">{t("staff.table.verifiedOnly")}</SelectItem>
              <SelectItem value="failed">{t("staff.table.failedOnly")}</SelectItem>
              <SelectItem value="pending">{t("staff.table.pendingOnly")}</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="glass border-white/20 text-white hover:bg-white/20 w-full sm:w-[180px]"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "MMM dd, yyyy") : t("staff.table.pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/20">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/80 w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead className="text-white/80">{t("staff.table.guestName")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.roomNumber")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.status")}</TableHead>
              <TableHead className="text-white/80">TM30</TableHead>
              <TableHead className="text-white/80">{t("staff.table.score")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.time")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-white/60 py-8">
                  {t("staff.table.noVerifications")}
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => {
                const isReady = tm30ReadyMap[session.id] || getTM30ReadyStatus(session.tm30).ready;
                return (
                  <AnimatePresence key={session.id}>
                    <TableRow className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(session.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(session.id, checked === true)
                          }
                          disabled={!isReady}
                          className="border-white/30 data-[state=checked]:bg-primary disabled:opacity-30"
                        />
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {session.guest_name}
                      </TableCell>
                      <TableCell className="text-white/80">{session.room_number}</TableCell>
                      <TableCell>{getStatusBadge(session)}</TableCell>
                      <TableCell>{getTM30StatusBadge(session)}</TableCell>
                      <TableCell className="text-white/80">
                        {session.verification_score > 0
                          ? `${(session.verification_score * 100).toFixed(0)}%`
                          : t("staff.table.na")}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {formatTime(session.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedRow(expandedRow === session.id ? null : session.id)
                          }
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          {expandedRow === session.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === session.id && (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={8} className="p-0">
                          <TM30DetailsDrawer
                            session={session}
                            onSave={handleSaveTM30}
                            onMarkReady={handleMarkReady}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default VerificationsTableStaff;
