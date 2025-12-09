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
import { Download, Search, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

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
  const [dataType, setDataType] = useState<"realtime" | "hourly" | "daily">("realtime");
  const [data, setData] = useState<DataPoint[] | DailyDataPoint[]>([]);
  const [responseType, setResponseType] = useState<"realtime" | "hourly" | "daily">("realtime");
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
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
          "날짜": row.date,
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
          "타임스탐프": new Date(point.timestamp).toLocaleString("ko-KR"),
          "주소": point.address,
          "주소명": point.name || "-",
          "값": point.value,
        }));
        colWidths = [
          { wch: 20 },
          { wch: 15 },
          { wch: 25 },
          { wch: 15 },
        ];
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
      let url = `/api/data/delete?from=${startDate}&to=${endDate}`;
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

      const successMsg = `${result.deletedCount}개의 데이터를 삭제했습니다.`;
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            데이터 관리
          </h1>
          <p className="text-muted-foreground">
            DB에 저장된 폴링 데이터를 조회하고 엑셀로 다운로드합니다.
          </p>
        </div>

        {/* 검색 영역 */}
        <div className="bg-card border border-border rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* 시작 날짜 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                시작
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 종료 날짜 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                종료
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 데이터 타입 선택 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                타입
              </label>
              <select
                value={dataType}
                onChange={(e) => {
                  setDataType(e.target.value as "realtime" | "hourly" | "daily");
                  if (e.target.value === "daily") {
                    setAddress("");
                  }
                }}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="realtime">실시간</option>
                <option value="hourly">시간별</option>
                <option value="daily">일일</option>
              </select>
            </div>

            {/* 주소 선택 (daily 제외) */}
            {dataType !== "daily" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  주소
                </label>
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  {availableAddresses.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 조회 버튼 */}
            <button
              onClick={handleQuery}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span>조회 중...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  조회
                </>
              )}
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 text-red-700 dark:text-red-400 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {success && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/50 text-green-700 dark:text-green-400 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* 결과 통계 및 버튼 */}
          {data.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {data.length}
                </span>
                개
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </button>
                <button
                  onClick={handleOpenDeleteDialog}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>

        {/* realtime/hourly 데이터 테이블 */}
        {responseType !== "daily" && data.length > 0 && (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">시간</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">주소</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">설명</th>
                    <th className="px-4 py-2 text-right font-semibold text-foreground">값</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data as DataPoint[]).slice(0, 100).map((point, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(point.timestamp).toLocaleTimeString("ko-KR")}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">
                        {point.address}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {point.name ? (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                            {point.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground font-semibold">
                        {typeof point.value === "number" ? point.value.toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 정보 */}
            {data.length > 100 && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-border text-xs text-muted-foreground">
                처음 100개만 표시 (전체는 다운로드)
              </div>
            )}
          </div>
        )}

        {/* daily 데이터 테이블 */}
        {responseType === "daily" && data.length > 0 && (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-foreground min-w-20">날짜</th>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i} className="px-1.5 py-2 text-center font-semibold text-foreground text-xs min-w-12">
                        {String(i).padStart(2, "0")}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-semibold text-foreground min-w-28">업데이트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data as DailyDataPoint[]).slice(0, 50).map((row, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-3 py-1.5 font-medium text-foreground">
                        {row.date}
                      </td>
                      {[
                        row.h0, row.h1, row.h2, row.h3, row.h4, row.h5, row.h6, row.h7,
                        row.h8, row.h9, row.h10, row.h11, row.h12, row.h13, row.h14, row.h15,
                        row.h16, row.h17, row.h18, row.h19, row.h20, row.h21, row.h22, row.h23,
                      ].map((value, hIndex) => (
                        <td key={hIndex} className="px-1.5 py-1.5 text-center text-foreground">
                          {value || "-"}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">
                        {new Date(row.last_update).toLocaleTimeString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 정보 */}
            {data.length > 50 && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-border text-xs text-muted-foreground">
                처음 50개만 표시 (전체는 다운로드)
              </div>
            )}
          </div>
        )}

        {/* 빈 상태 */}
        {mounted && data.length === 0 && !loading && !error && (
          <div className="bg-card border border-border rounded-lg p-8 text-center mt-6">
            <p className="text-sm text-muted-foreground">
              조회된 데이터가 없습니다. 위의 조건을 입력하고 조회 버튼을 클릭하세요.
            </p>
          </div>
        )}
      </div>

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
