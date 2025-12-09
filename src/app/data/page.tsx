/**
 * @file src/app/data/page.tsx
 * @description
 * 데이터 관리 페이지
 * - DB에 저장된 모든 폴링 데이터 조회
 * - 날짜 범위 선택하여 데이터 필터링
 * - 데이터 타입별로 다른 형식으로 표시 (realtime/hourly vs daily)
 * - 엑셀 파일로 다운로드
 *
 * 초보자 가이드:
 * 1. **날짜 선택**: 시작 날짜와 종료 날짜 선택
 * 2. **데이터 타입**: realtime(센서), hourly(시간별에너지), daily(일일누적에너지) 선택
 * 3. **주소 필터**: 특정 주소의 데이터만 조회 (선택 사항, realtime/hourly만)
 * 4. **데이터 조회**: "조회" 버튼 클릭
 * 5. **다운로드**: "엑셀 다운로드" 버튼으로 파일 저장
 */

"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Search,
  Trash2,
  Database,
  Filter,
  ArrowDownToLine,
  Trash,
} from "lucide-react";
import * as XLSX from "xlsx";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 실시간/시간별 데이터 포인트
 */
interface DataPoint {
  timestamp: number;
  address: string;
  value: number;
  name?: string;
}

/**
 * 일일 에너지 데이터 포인트 (날짜 + h0-h23 + last_update)
 */
interface DailyDataPoint {
  date: string;
  h0: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
  h7: number;
  h8: number;
  h9: number;
  h10: number;
  h11: number;
  h12: number;
  h13: number;
  h14: number;
  h15: number;
  h16: number;
  h17: number;
  h18: number;
  h19: number;
  h20: number;
  h21: number;
  h22: number;
  h23: number;
  last_update: number;
}

interface QueryResult {
  address?: string;
  type: "realtime" | "hourly" | "daily";
  data: DataPoint[] | DailyDataPoint[];
  count: number;
}

export default function DataPage() {
  const [mounted, setMounted] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [dataType, setDataType] = useState<"realtime" | "hourly" | "daily">(
    "realtime"
  );
  const [data, setData] = useState<DataPoint[] | DailyDataPoint[]>([]);
  const [responseType, setResponseType] = useState<
    "realtime" | "hourly" | "daily"
  >("realtime");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /**
   * 클라이언트 마운트 확인
   */
  useEffect(() => {
    setMounted(true);
    initializeDateRange();
    fetchAvailableAddresses();
  }, []);

  /**
   * 기본 날짜 범위 설정 (오늘 기준)
   */
  const initializeDateRange = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 7);

    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;

    setStartDate(formatDate(yesterday));
    setEndDate(formatDate(today));
  };

  /**
   * 사용 가능한 주소 목록 조회
   */
  const fetchAvailableAddresses = async () => {
    try {
      const response = await fetch("/api/data/addresses");
      if (response.ok) {
        const result = await response.json();
        setAvailableAddresses(result.addresses || []);
      }
    } catch (error) {
      console.error("Failed to fetch available addresses:", error);
    }
  };

  /**
   * 데이터 조회
   */
  const handleQuery = async () => {
    if (!startDate || !endDate) {
      setError("시작 날짜와 종료 날짜를 선택하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setData([]);

    try {
      let url = `/api/data/query?from=${startDate}&to=${endDate}&type=${dataType}`;
      if (address && dataType !== "daily") {
        url += `&address=${address}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("데이터 조회 실패");
      }

      const result: QueryResult = await response.json();
      setData(result.data || []);
      setResponseType(result.type || dataType);

      if (result.data?.length === 0) {
        setError("조회된 데이터가 없습니다.");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "데이터 조회 중 오류 발생"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 엑셀 다운로드
   */
  const handleDownloadExcel = () => {
    if (data.length === 0) {
      setError("다운로드할 데이터가 없습니다.");
      return;
    }

    try {
      let excelData: any[] = [];
      let colWidths: any[] = [];
      let sheetName = "Data";

      if (responseType === "daily") {
        // daily_energy: 날짜 + h0-h23 + last_update
        excelData = (data as DailyDataPoint[]).map((row) => ({
          날짜: row.date,
          "00시": row.h0,
          "01시": row.h1,
          "02시": row.h2,
          "03시": row.h3,
          "04시": row.h4,
          "05시": row.h5,
          "06시": row.h6,
          "07시": row.h7,
          "08시": row.h8,
          "09시": row.h9,
          "10시": row.h10,
          "11시": row.h11,
          "12시": row.h12,
          "13시": row.h13,
          "14시": row.h14,
          "15시": row.h15,
          "16시": row.h16,
          "17시": row.h17,
          "18시": row.h18,
          "19시": row.h19,
          "20시": row.h20,
          "21시": row.h21,
          "22시": row.h22,
          "23시": row.h23,
          "마지막 업데이트": new Date(row.last_update).toLocaleString("ko-KR"),
        }));
        colWidths = Array(26).fill({ wch: 12 });
        sheetName = "일일에너지";
      } else {
        // realtime/hourly: 타임스탐프 + 주소 + 주소명 + 값
        excelData = (data as DataPoint[]).map((point) => ({
          타임스탐프: new Date(point.timestamp).toLocaleString("ko-KR"),
          주소: point.address,
          주소명: point.name || "-",
          값: point.value,
        }));
        colWidths = [{ wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];
        sheetName = responseType === "hourly" ? "시간별에너지" : "실시간센서";
      }

      // 워크북 생성
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      ws["!cols"] = colWidths;

      // 파일명 생성
      const fileName = `monitoring_data_${startDate}_to_${endDate}.xlsx`;

      // 다운로드
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      setError("엑셀 파일 생성 중 오류 발생");
      console.error(error);
    }
  };

  /**
   * 삭제 다이얼로그 열기
   */
  const handleOpenDeleteDialog = () => {
    if (data.length === 0) {
      setError("삭제할 데이터가 없습니다.");
      return;
    }
    setDeleteDialogOpen(true);
  };

  /**
   * 데이터 삭제 확인
   */
  const handleConfirmDelete = async () => {
    if (!startDate || !endDate) {
      setError("시작 날짜와 종료 날짜를 선택하세요.");
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      let url = `/api/data/delete-v2?from=${startDate}&to=${endDate}&type=${dataType}`;
      if (address && dataType !== "daily") {
        url += `&address=${address}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("데이터 삭제 실패");
      }

      const result = await response.json();

      setDeleteDialogOpen(false);
      setData([]);
      setError("");

      const successMsg =
        result.message || `${result.deletedCount}개의 데이터를 삭제했습니다.`;
      console.log(successMsg);
      setSuccess(successMsg);

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "데이터 삭제 중 오류 발생"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">데이터 관리</h1>
          <p className="text-muted-foreground mt-1">
            저장된 모니터링 데이터를 조회하고 관리합니다.
          </p>
        </div>
      </div>

      {/* 검색 필터 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">검색 필터</CardTitle>
          </div>
          <CardDescription>
            원하는 조건을 설정하여 데이터를 조회하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">시작 날짜</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">종료 날짜</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">데이터 타입</label>
              <select
                value={dataType}
                onChange={(e) => {
                  setDataType(
                    e.target.value as "realtime" | "hourly" | "daily"
                  );
                  if (e.target.value === "daily") {
                    setAddress("");
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="realtime">실시간 센서</option>
                <option value="hourly">시간별 에너지</option>
                <option value="daily">일일 누적 에너지</option>
              </select>
            </div>

            {dataType !== "daily" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">주소 (선택)</label>
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">전체 주소</option>
                  {availableAddresses.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleQuery}
              disabled={loading}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {loading ? (
                "조회 중..."
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  데이터 조회
                </>
              )}
            </button>
          </div>

          {/* 알림 메시지 */}
          <div className="mt-4 space-y-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">
                {success}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 데이터 결과 카드 */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">조회 결과</CardTitle>
              <CardDescription className="mt-1">
                {data.length > 0
                  ? `총 ${data.length.toLocaleString()}개의 데이터가 조회되었습니다.`
                  : "데이터를 조회해주세요."}
              </CardDescription>
            </div>
          </div>

          {data.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "h-9 px-4 py-2 bg-green-600 text-white hover:bg-green-700"
                )}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                엑셀 다운로드
              </button>
              <button
                onClick={handleOpenDeleteDialog}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "h-9 px-4 py-2 border border-input bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <Trash className="mr-2 h-4 w-4" />
                데이터 삭제
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {data.length > 0 ? (
            <div className="relative w-full overflow-auto max-h-[600px]">
              <table className="w-full caption-bottom text-sm text-left">
                {responseType === "daily" ? (
                  <thead className="sticky top-0 bg-secondary text-secondary-foreground z-10">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground min-w-[100px]">
                        날짜
                      </th>
                      {Array.from({ length: 24 }, (_, i) => (
                        <th
                          key={i}
                          className="h-12 px-2 align-middle font-center text-muted-foreground min-w-[50px] text-center"
                        >
                          {String(i).padStart(2, "0")}h
                        </th>
                      ))}
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground min-w-[150px]">
                        업데이트
                      </th>
                    </tr>
                  </thead>
                ) : (
                  <thead className="sticky top-0 bg-secondary text-secondary-foreground z-10">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[200px]">
                        시간
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[150px]">
                        주소
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        설명
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[150px]">
                        값
                      </th>
                    </tr>
                  </thead>
                )}

                <tbody className="[&_tr:last-child]:border-0">
                  {responseType === "daily"
                    ? (data as DailyDataPoint[])
                        .slice(0, 100)
                        .map((row, index) => (
                          <tr
                            key={index}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <td className="p-4 align-middle font-medium">
                              {row.date}
                            </td>
                            {[
                              row.h0,
                              row.h1,
                              row.h2,
                              row.h3,
                              row.h4,
                              row.h5,
                              row.h6,
                              row.h7,
                              row.h8,
                              row.h9,
                              row.h10,
                              row.h11,
                              row.h12,
                              row.h13,
                              row.h14,
                              row.h15,
                              row.h16,
                              row.h17,
                              row.h18,
                              row.h19,
                              row.h20,
                              row.h21,
                              row.h22,
                              row.h23,
                            ].map((value, hIndex) => (
                              <td
                                key={hIndex}
                                className="p-2 align-middle text-center text-xs"
                              >
                                {value !== null && value !== undefined
                                  ? value
                                  : "-"}
                              </td>
                            ))}
                            <td className="p-4 align-middle text-muted-foreground">
                              {new Date(row.last_update).toLocaleTimeString(
                                "ko-KR"
                              )}
                            </td>
                          </tr>
                        ))
                    : (data as DataPoint[])
                        .slice(0, 100)
                        .map((point, index) => (
                          <tr
                            key={index}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <td className="p-4 align-middle font-medium text-muted-foreground">
                              {new Date(point.timestamp).toLocaleString(
                                "ko-KR"
                              )}
                            </td>
                            <td className="p-4 align-middle font-semibold">
                              {point.address}
                            </td>
                            <td className="p-4 align-middle">
                              {point.name ? (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                  {point.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-4 align-middle text-right font-mono font-medium">
                              {typeof point.value === "number"
                                ? point.value.toFixed(2)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">데이터가 없습니다</p>
              <p className="text-sm">
                상단 필터에서 조건을 변경하여 조회해보세요.
              </p>
            </div>
          )}
        </CardContent>
        {data.length > 100 && (
          <CardFooter className="bg-muted/40 p-4 border-t flex justify-center text-sm text-muted-foreground">
            성능을 위해 최신 100개 데이터만 표시됩니다. 전체 데이터는 엑셀
            다운로드를 이용해주세요.
          </CardFooter>
        )}
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        title="데이터 삭제"
        message={`${startDate} ~ ${endDate}${
          address && dataType !== "daily" ? ` (주소: ${address})` : ""
        } 범위의 데이터를 삭제하시겠습니까?`}
        itemCount={data.length}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleting}
      />
    </div>
  );
}
