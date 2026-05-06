import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Product from "../models/Product";
import Sale from "../models/Sale";
import Purchase from "../models/Purchase";
import Staff from "../models/Staff";
import Attendance from "../models/Attendance";
import SalaryPayment from "../models/SalaryPayment";
import mongoose from "mongoose";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);

    // boundary calculation in IST (Asia/Kolkata)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setUTCHours(0, 0, 0, 0);
    const startOfDayUTC = new Date(todayIST.getTime() - istOffset);

    const { timeRange = "today" } = req.query;
    let periodMatchQuery: any = { tenantId };
    let prevPeriodMatchQuery: any = { tenantId };

    if (timeRange === "today") {
      periodMatchQuery.date = { $gte: startOfDayUTC };
      const yesterdayStart = new Date(startOfDayUTC);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      const durationMs = now.getTime() - startOfDayUTC.getTime();
      const yesterdayEndEquivalent = new Date(yesterdayStart.getTime() + durationMs);
      prevPeriodMatchQuery.date = { $gte: yesterdayStart, $lt: yesterdayEndEquivalent };
    } else if (timeRange === "yesterday") {
      const yesterdayStart = new Date(startOfDayUTC);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      periodMatchQuery.date = { $gte: yesterdayStart, $lt: startOfDayUTC };

      const dayBeforeStart = new Date(yesterdayStart);
      dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
      prevPeriodMatchQuery.date = { $gte: dayBeforeStart, $lt: yesterdayStart };
    } else if (timeRange === "week") {
      // Current calendar week (Sunday to Saturday)
      const startOfWeekIST = new Date(todayIST);
      startOfWeekIST.setUTCDate(todayIST.getUTCDate() - todayIST.getUTCDay());
      const startOfWeekUTC = new Date(startOfWeekIST.getTime() - istOffset);
      periodMatchQuery.date = { $gte: startOfWeekUTC };

      const durationMs = now.getTime() - startOfWeekUTC.getTime();
      const prevWeekStart = new Date(startOfWeekUTC);
      prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
      const prevWeekEndEquivalent = new Date(prevWeekStart.getTime() + durationMs);
      prevPeriodMatchQuery.date = { $gte: prevWeekStart, $lt: prevWeekEndEquivalent };
    } else if (timeRange === "month") {
      // Current calendar month (1st to last day)
      const startOfMonthIST = new Date(todayIST);
      startOfMonthIST.setUTCDate(1);
      const startOfMonthUTC = new Date(startOfMonthIST.getTime() - istOffset);
      periodMatchQuery.date = { $gte: startOfMonthUTC };

      const durationMs = now.getTime() - startOfMonthUTC.getTime();
      const prevMonthStart = new Date(startOfMonthUTC);
      prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);
      const prevMonthEndEquivalent = new Date(prevMonthStart.getTime() + durationMs);
      prevPeriodMatchQuery.date = { $gte: prevMonthStart, $lt: prevMonthEndEquivalent };
    } else if (timeRange === "year") {
      // Current calendar year (Jan to Dec)
      const startOfYearIST = new Date(todayIST);
      startOfYearIST.setUTCMonth(0, 1);
      const startOfYearUTC = new Date(startOfYearIST.getTime() - istOffset);
      periodMatchQuery.date = { $gte: startOfYearUTC };

      const durationMs = now.getTime() - startOfYearUTC.getTime();
      const prevYearStart = new Date(startOfYearUTC);
      prevYearStart.setUTCFullYear(prevYearStart.getUTCFullYear() - 1);
      const prevYearEndEquivalent = new Date(prevYearStart.getTime() + durationMs);
      prevPeriodMatchQuery.date = { $gte: prevYearStart, $lt: prevYearEndEquivalent };
    } else if (timeRange === "all") {
      periodMatchQuery = { tenantId };
      prevPeriodMatchQuery = { tenantId, _id: new mongoose.Types.ObjectId() }; // No matches for trend
    }

    const getDateFormat = (range: any) => {
      if (range === "today" || range === "yesterday") return "%Y-%m-%d %H:00";
      if (range === "year" || range === "all") return "%Y-%m";
      return "%Y-%m-%d";
    };
    const dateFormat = getDateFormat(timeRange);

    const [
      periodStatsAgg,
      prevPeriodStatsAgg,
      periodPurchasesAgg,
      prevPeriodPurchasesAgg,
      periodSalariesAgg,
      prevPeriodSalariesAgg,
      toCollectAgg,
      toPayAgg,
      stockValueAgg,
      totalPaidSalesAgg,
      totalPaidPurchasesAgg,
      totalSalariesAgg,
      lowStockProducts,
      staffPresentToday,
      allStaff,
      allAttendance,
      allPayments,
      recentSales,
      todaySalesAgg,
      periodStatsChartAgg,
      periodPurchasesChartAgg,
      periodSalariesChartAgg,
    ] = await Promise.all([
      // Period Sales & Profit
      Sale.aggregate([
        { $match: periodMatchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            profit: { $sum: "$totalProfit" },
          },
        },
      ]),
      Sale.aggregate([
        { $match: prevPeriodMatchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            profit: { $sum: "$totalProfit" },
          },
        },
      ]),
      // Period Purchases (Paid) for Expense calculation
      Purchase.aggregate([
        { $match: { ...periodMatchQuery, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Purchase.aggregate([
        { $match: { ...prevPeriodMatchQuery, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // Period Salaries (Paid)
      SalaryPayment.aggregate([
        { $match: periodMatchQuery },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      SalaryPayment.aggregate([
        { $match: prevPeriodMatchQuery },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Totals and Alerts
      Sale.aggregate([
        { $match: { tenantId, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Purchase.aggregate([
        { $match: { tenantId, paymentStatus: "pending" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Product.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: null,
            totalPurchaseValue: {
              $sum: { $multiply: ["$stock", "$purchasePrice"] },
            },
            totalSellingValue: {
              $sum: { $multiply: ["$stock", "$pricePerUnit"] },
            },
          },
        },
      ]),
      // Lifetime totals for Balance
      Sale.aggregate([
        { $match: { tenantId, status: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Purchase.aggregate([
        { $match: { tenantId, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      SalaryPayment.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Product.find({ tenantId, $expr: { $lte: ["$stock", "$minStockAlert"] } }),
      Attendance.countDocuments({
        tenantId,
        date: { $gte: startOfDayUTC },
        status: { $ne: "absent" },
      }),
      Staff.find({ tenantId, status: "active" }),
      Attendance.find({ tenantId }),
      SalaryPayment.find({ tenantId }),
      Sale.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("items.productId", "name pricePerUnit unit"),
      Sale.aggregate([
        { $match: { tenantId, date: { $gte: startOfDayUTC } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // Chart Data Aggregations
      Sale.aggregate([
        { $match: periodMatchQuery },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$date", timezone: "Asia/Kolkata" } },
            revenue: { $sum: "$totalAmount" },
            profit: { $sum: "$totalProfit" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Purchase.aggregate([
        { $match: { ...periodMatchQuery, paymentStatus: "paid" } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$date", timezone: "Asia/Kolkata" } },
            expenses: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      SalaryPayment.aggregate([
        { $match: periodMatchQuery },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$date", timezone: "Asia/Kolkata" } },
            expenses: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Helper to format date hacked objects matching MongoDB's $dateToString IST
    const formatDate = (date: Date, fmt: string) => {
      const y = date.getUTCFullYear();
      const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
      const d = date.getUTCDate().toString().padStart(2, "0");
      const h = date.getUTCHours().toString().padStart(2, "0");
      if (fmt === "%Y-%m-%d %H:00") return `${y}-${m}-${d} ${h}:00`;
      if (fmt === "%Y-%m") return `${y}-${m}`;
      return `${y}-${m}-${d}`;
    };

    // Merge Chart Data and Fill Gaps
    const chartDataMap = new Map();

    // Pre-populate based on timeRange
    if (timeRange === "today" || timeRange === "yesterday") {
      const start = new Date(timeRange === "today" ? todayIST : new Date(todayIST.getTime() - 24 * 60 * 60 * 1000));
      for (let i = 0; i < 24; i++) {
        const d = new Date(start);
        d.setUTCHours(i);
        const key = formatDate(d, dateFormat);
        chartDataMap.set(key, { date: key, revenue: 0, profit: 0, expenses: 0 });
      }
    } else if (timeRange === "week") {
      const startOfWeekIST = new Date(todayIST);
      startOfWeekIST.setUTCDate(todayIST.getUTCDate() - todayIST.getUTCDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeekIST);
        d.setUTCDate(d.getUTCDate() + i);
        const key = formatDate(d, dateFormat);
        chartDataMap.set(key, { date: key, revenue: 0, profit: 0, expenses: 0 });
      }
    } else if (timeRange === "month") {
      const startOfMonthIST = new Date(todayIST);
      startOfMonthIST.setUTCDate(1);
      const lastDay = new Date(Date.UTC(todayIST.getUTCFullYear(), todayIST.getUTCMonth() + 1, 0)).getUTCDate();
      for (let i = 0; i < lastDay; i++) {
        const d = new Date(startOfMonthIST);
        d.setUTCDate(d.getUTCDate() + i);
        const key = formatDate(d, dateFormat);
        chartDataMap.set(key, { date: key, revenue: 0, profit: 0, expenses: 0 });
      }
    } else if (timeRange === "year") {
      const startOfYearIST = new Date(todayIST);
      startOfYearIST.setUTCMonth(0, 1);
      for (let i = 0; i < 12; i++) {
        const d = new Date(startOfYearIST);
        d.setUTCMonth(i);
        const key = formatDate(d, dateFormat);
        chartDataMap.set(key, { date: key, revenue: 0, profit: 0, expenses: 0 });
      }
    }

    periodStatsChartAgg.forEach((s) => {
      chartDataMap.set(s._id, {
        date: s._id,
        revenue: s.revenue,
        profit: s.profit,
        expenses: 0,
      });
    });

    [...periodPurchasesChartAgg, ...periodSalariesChartAgg].forEach((e) => {
      const current = chartDataMap.get(e._id) || {
        date: e._id,
        revenue: 0,
        profit: 0,
        expenses: 0,
      };
      current.expenses += e.expenses || 0;
      chartDataMap.set(e._id, current);
    });

    const chartData = Array.from(chartDataMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const periodSales = periodStatsAgg[0]?.total || 0;
    const periodProfit = periodStatsAgg[0]?.profit || 0;
    const periodPurchases = periodPurchasesAgg[0]?.total || 0;
    const periodSalaries = periodSalariesAgg[0]?.total || 0;
    const periodExpenses = periodPurchases + periodSalaries;

    const prevPeriodSales = prevPeriodStatsAgg[0]?.total || 0;
    const prevPeriodProfit = prevPeriodStatsAgg[0]?.profit || 0;
    const prevPeriodPurchases = prevPeriodPurchasesAgg[0]?.total || 0;
    const prevPeriodSalaries = prevPeriodSalariesAgg[0]?.total || 0;
    const prevPeriodExpenses = prevPeriodPurchases + prevPeriodSalaries;

    const todaySales = todaySalesAgg[0]?.total || 0;

    const salesTrend = calculateTrend(periodSales, prevPeriodSales);
    const profitTrend = calculateTrend(periodProfit, prevPeriodProfit);
    const expensesTrend = calculateTrend(
      periodExpenses,
      prevPeriodExpenses,
      true,
    ); // true means lower is better

    function calculateTrend(
      current: number,
      previous: number,
      lowerIsBetter = false,
    ) {
      if (previous === 0)
        return current > 0 ? (lowerIsBetter ? "-100%" : "+100%") : "Stable";
      const diff = ((current - previous) / previous) * 100;
      const sign = diff >= 0 ? "+" : "";
      return sign + diff.toFixed(1) + "%";
    }

    // Pending salaries (same logic as before)
    let totalPendingSalary = 0;
    const paymentsMap = new Map();
    allPayments.forEach((p) => {
      const current = paymentsMap.get(p.staffId.toString()) || 0;
      paymentsMap.set(p.staffId.toString(), current + p.amount);
    });
    const attendanceMap = new Map();
    allAttendance.forEach((a) => {
      const current = attendanceMap.get(a.staffId.toString()) || 0;
      const value =
        a.status === "full-day" ? 1 : a.status === "half-day" ? 0.5 : 0;
      attendanceMap.set(a.staffId.toString(), current + value);
    });
    allStaff.forEach((s) => {
      const days = attendanceMap.get(s._id.toString()) || 0;
      const earned =
        s.salaryType === "daily" ? days * s.salaryAmount : s.salaryAmount;
      const paid = paymentsMap.get(s._id.toString()) || 0;
      totalPendingSalary += Math.max(0, earned - paid);
    });

    const estimatedBalance =
      (totalPaidSalesAgg[0]?.total || 0) -
      (totalPaidPurchasesAgg[0]?.total || 0) -
      (totalSalariesAgg[0]?.total || 0);

    const responseData: any = {
      stats: {
        periodSales,
        periodProfit,
        periodExpenses,
        salesTrend,
        profitTrend,
        expensesTrend,
        todaySales,
        toCollect: toCollectAgg[0]?.total || 0,
        toPay: (toPayAgg[0]?.total || 0) + totalPendingSalary,
        stockValue: stockValueAgg[0]?.totalPurchaseValue || 0,
        stockSellingValue: stockValueAgg[0]?.totalSellingValue || 0,
        estimatedBalance,
        lowStockCount: lowStockProducts.length,
        presentToday: staffPresentToday,
        totalStaff: allStaff.length,
        invoiceCount: recentSales.length,
      },
      chartData,
      recentActivity: recentSales.map((s) => ({
        id: s._id,
        title: s.customerName,
        customerName: s.customerName,
        invoiceNumber:
          s.invoiceNumber || s._id.toString().slice(-6).toUpperCase(),
        amount: s.totalAmount,
        date: s.date,
        status: s.status,
        itemCount: s.items.length,
        items: s.items.map((item: any) => ({
          productId: item.productId
            ? { name: item.productId.name, unit: item.productId.unit }
            : null,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
        })),
        additionalItems: s.additionalItems,
      })),
      alerts: lowStockProducts.map((p) => ({
        type: "stock",
        title: "Low Stock Alert",
        message: `${p.name} is low on stock (${p.stock} remaining)`,
        severity: "high",
      })),
    };

    if (req.user?.role === "staff") {
      // Hide sensitive data for staff
      responseData.stats.periodSales = 0;
      responseData.stats.periodProfit = 0;
      responseData.stats.periodExpenses = 0;
      responseData.stats.salesTrend = "0%";
      responseData.stats.profitTrend = "0%";
      responseData.stats.expensesTrend = "0%";
      responseData.stats.toCollect = 0;
      responseData.stats.toPay = 0;
      responseData.stats.stockValue = 0;
      responseData.stats.stockSellingValue = 0;
      responseData.stats.estimatedBalance = 0;
      responseData.chartData = responseData.chartData.map((d: any) => ({ ...d, revenue: 0, profit: 0, expenses: 0 }));
    }

    res.status(200).json(responseData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
