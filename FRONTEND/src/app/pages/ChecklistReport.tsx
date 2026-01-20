import React, { useState, useEffect } from "react";
import {
  barcodeChecklistAPI,
  wheelChecklistAPI,
  checkingListChecklistAPI,
  checklistAPI,
} from "../../api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";

interface ReportItem {
  hanger_no: number;
  submission_date: string;
  submitted_by: string;
  completed_items: number;
  pending_items: number;
  failed_items: number;
  total_items: number;
  remarks?: string;
}

interface DetailItem {
  sr_no: number;
  activity: string;
  status: string;
  remarks?: string;
  done_by?: string;
  done_on?: string;
}

export default function ChecklistReport() {
  const [serviceReport, setServiceReport] = useState<ReportItem[]>([]);
  const [barcodeReport, setBarcodeReport] = useState<ReportItem[]>([]);
  const [wheelReport, setWheelReport] = useState<ReportItem[]>([]);
  const [checkingListReport, setCheckingListReport] = useState<ReportItem[]>(
    []
  );

  const [selectedDetail, setSelectedDetail] = useState<DetailItem[] | null>(
    null
  );
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [selectedHangerNo, setSelectedHangerNo] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      const [service, barcode, wheel, checkingList] = await Promise.all([
        checklistAPI.getReport().catch(() => ({ data: [] })),
        barcodeChecklistAPI.getReport().catch(() => ({ data: [] })),
        wheelChecklistAPI.getReport().catch(() => ({ data: [] })),
        checkingListChecklistAPI.getReport().catch(() => ({ data: [] })),
      ]);

      setServiceReport(service.data || []);
      setBarcodeReport(barcode.data || []);
      setWheelReport(wheel.data || []);
      setCheckingListReport(checkingList.data || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (type: string, hangerNo: number, date: string) => {
    try {
      setDetailLoading(true);
      let response;

      if (type === "service") {
        response = await checklistAPI.getReportDetails(
          hangerNo.toString(),
          date,
          ""
        );
      } else if (type === "barcode") {
        response = await barcodeChecklistAPI.getReportDetails(
          hangerNo.toString(),
          date
        );
      } else if (type === "wheel") {
        response = await wheelChecklistAPI.getReportDetails(
          hangerNo.toString(),
          date
        );
      } else if (type === "checking-list") {
        response = await checkingListChecklistAPI.getReportDetails(
          hangerNo.toString(),
          date
        );
      }

      setSelectedDetail(response?.data || []);
      setSelectedReportType(type);
      setSelectedHangerNo(hangerNo);
      setSelectedDate(date);
    } catch (error) {
      console.error("Failed to load details:", error);
      // Set empty details if there's an error
      setSelectedDetail([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const ReportTable = ({
    data,
    onRowClick,
  }: {
    data: ReportItem[];
    onRowClick: (item: ReportItem) => void;
  }) => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <p className="text-center py-8 text-gray-500">No reports available</p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hanger No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Submitted By</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Pending</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow key={idx} className="cursor-pointer hover:bg-gray-50">
              <TableCell className="font-medium">{item.hanger_no}</TableCell>
              <TableCell>
                {new Date(item.submission_date).toLocaleDateString()}
              </TableCell>
              <TableCell>{item.submitted_by || "N/A"}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {item.completed_items}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                >
                  {item.pending_items}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  {item.failed_items}
                </Badge>
              </TableCell>
              <TableCell>{item.total_items}</TableCell>
              <TableCell>
                <button
                  onClick={() => onRowClick(item)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  View Details
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const DetailModal = () => {
    if (!selectedDetail) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
          {/* Fixed Header - Always Visible */}
          <div className="p-4 border-b bg-white rounded-t-lg flex-shrink-0">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedReportType.charAt(0).toUpperCase() +
                    selectedReportType.slice(1)}{" "}
                  Checklist Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Hanger {selectedHangerNo} • Submitted by{" "}
                  {selectedDetail[0]?.done_by || "N/A"} •{" "}
                  {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content - Only Items Scroll */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {detailLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDetail.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.sr_no}</TableCell>
                      <TableCell>{item.activity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "done"
                              ? "default"
                              : item.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.remarks || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Fixed Footer - Always Visible */}
          <div className="p-4 border-t bg-white rounded-b-lg flex-shrink-0">
            <button
              onClick={() => setSelectedDetail(null)}
              className="w-full px-6 py-3 bg-[#0b5d3b] text-white font-semibold rounded-lg hover:bg-[#0a4d30] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Checklist Reports
        </h1>
        <p className="text-gray-600">
          View comprehensive reports for all four checklist types
        </p>
      </div>

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="barcode">Barcode</TabsTrigger>
          <TabsTrigger value="wheel">Wheel</TabsTrigger>
          <TabsTrigger value="checking-list">Checking List</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Checklist Report</CardTitle>
              <CardDescription>
                All service checklist submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={serviceReport}
                onRowClick={(item) =>
                  loadDetails("service", item.hanger_no, item.submission_date)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcode" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Barcode Checklist Report</CardTitle>
              <CardDescription>
                All barcode checklist submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={barcodeReport}
                onRowClick={(item) =>
                  loadDetails("barcode", item.hanger_no, item.submission_date)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wheel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Wheel Checklist Report</CardTitle>
              <CardDescription>All wheel checklist submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={wheelReport}
                onRowClick={(item) =>
                  loadDetails("wheel", item.hanger_no, item.submission_date)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checking-list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Checking List Report</CardTitle>
              <CardDescription>All checking list submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={checkingListReport}
                onRowClick={(item) =>
                  loadDetails(
                    "checking-list",
                    item.hanger_no,
                    item.submission_date
                  )
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DetailModal />
    </div>
  );
}
