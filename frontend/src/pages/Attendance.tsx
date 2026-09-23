import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Check,
  X,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import type { Staff, AttendanceRecord } from "../types";
import { useAuth } from "../context/AuthContext";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { format, addDays, subDays, isSameDay } from "date-fns";
import UpgradePrompt from "../components/UpgradePrompt";
import { canUseFeature } from "../utils/planLimits";

const Attendance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date());
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const { data: staffList = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await axios.get<Staff[]>("/api/staff", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!user?.token,
  });

  const {
    data: attendanceData = [],
    isLoading: attendanceLoading,
    isRefetching: attendanceRefreshing,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", date.toISOString().split("T")[0]],
    queryFn: async () => {
      const res = await axios.get<AttendanceRecord[]>(
        `/api/attendance?date=${date.toISOString()}`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      return res.data;
    },
    enabled: !!user?.token,
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const loading = staffLoading || (attendanceLoading && !attendanceRefreshing);

  useEffect(() => {
    if (attendanceData) {
      setAttendance(attendanceData);
    }
  }, [attendanceData]);

  const getStatus = (staffId: string) => {
    const record = attendance.find(
      (r) =>
        (typeof r.staffId !== "string" && r.staffId?._id === staffId) ||
        r.staffId === staffId,
    );
    return record?.status || null;
  };

  const updateStatus = (
    staffId: string,
    status: "full-day" | "half-day" | "absent",
  ) => {
    const newAttendance = [...attendance];
    const index = newAttendance.findIndex(
      (r) =>
        (typeof r.staffId !== "string" && r.staffId?._id === staffId) ||
        r.staffId === staffId,
    );

    if (index > -1) {
      newAttendance[index] = {
        ...newAttendance[index],
        status,
      } as AttendanceRecord;
    } else {
      const record: AttendanceRecord = {
        staffId,
        status,
        date: date.toISOString(),
      };
      newAttendance.push(record);
    }
    setAttendance(newAttendance);
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (records: any) => {
      return axios.post(
        "/api/attendance/mark",
        {
          date: date.toISOString(),
          records,
        },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", date.toISOString().split("T")[0]],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast(t("staff.attendance_success"), "success");
    },
    onError: () => {
      showToast(t("staff.attendance_error"), "error");
    },
  });

  const handleDateClick = () => {
    if (dateInputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const saveAttendance = async () => {
    const records = attendance.map((r) => ({
      staffId: typeof r.staffId !== "string" ? r.staffId?._id : r.staffId,
      status: r.status,
    }));
    saveMutation.mutate(records);
  };

  if (loading) return <TableSkeleton rows={10} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("common.attendance")}
          </h1>
          <p className="text-slate-500">{t("staff.mark_presence")}</p>
        </div>
        <div className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-slate-100 shadow-sm relative">
          <button
            onClick={() => setDate(subDays(date, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-all"
          >
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div
            onClick={handleDateClick}
            className="flex items-center gap-2 px-2 relative group cursor-pointer hover:bg-slate-50 rounded-xl transition-all py-1"
          >
            <Calendar size={18} className="text-primary-600" />
            <span className="text-sm font-black text-slate-700 uppercase tracking-tighter min-w-[100px] text-center">
              {isSameDay(date, new Date())
                ? t("dashboard.today")
                : format(date, "dd MMM yyyy")}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
          </div>
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-all"
          >
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("staff.employee")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-center">
                  {t("dashboard.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffList.map((staff) => {
                const currentStatus = getStatus(staff._id!);
                return (
                  <tr
                    key={staff._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {staff.name}
                          </p>
                          <p className="text-xs text-slate-400 uppercase tracking-widest">
                            {staff.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateStatus(staff._id!, "full-day")}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            currentStatus === "full-day"
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          <Check size={14} /> {t("staff.full_day")}
                        </button>
                        <button
                          onClick={() => updateStatus(staff._id!, "half-day")}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            currentStatus === "half-day"
                              ? "bg-amber-500 text-white shadow-lg shadow-amber-100"
                              : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          }`}
                        >
                          <Clock size={14} /> {t("staff.half_day")}
                        </button>
                        <button
                          onClick={() => updateStatus(staff._id!, "absent")}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            currentStatus === "absent"
                              ? "bg-rose-600 text-white shadow-lg shadow-rose-100"
                              : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          }`}
                        >
                          <X size={14} /> {t("staff.absent")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 lg:left-[calc(50%+128px)] z-40">
        <button
          onClick={saveAttendance}
          disabled={saveMutation.isPending}
          className="btn-primary py-4 px-12 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10"
        >
          <Save size={20} />
          {saveMutation.isPending
            ? t("staff.saving")
            : t("staff.save_attendance")}
        </button>
      </div>
    </div>
  );
};

export default Attendance;
