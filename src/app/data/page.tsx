/**
 * @file src/app/data/page.tsx
 * @description
 * 데이터 관리 페이지
 * - DB에 저장된 모든 폴링 데이터 조회
 * - 날짜 범위 선택하여 데이터 필터링
 * - 엑셀 파일로 다운로드
 *
 * 초보자 가이드:
 * 1. **날짜 선택**: 시작 날짜와 종료 날짜 선택
 * 2. **주소 필터**: 특정 주소의 데이터만 조회 (선택 사항)
 * 3. **데이터 조회**: "조회" 버튼 클릭
 * 4. **다운로드**: "엑셀 다운로드" 버튼으로 파일 저장
 */

"use client";

import { useState, useEffect } from "react";
import { Download, RotateCcw, Search, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

/**
 * 데이터 포인트 인터페이스
 * - name: 주소의 의미 (예: "수절온도1", "순방향 유효전력량")
 */
interface DataPoint {
  timestamp: number;
  address: string;
  value: number;
  name?: string; // 주소의 이름/설명
}

interface QueryResult {
  address?: string;
  data: DataPoint[];
  count: number;
}

export default function DataPage() {
  const [mounted, setMounted] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [dataType, setDataType] = useState<"realtime" | "hourly">("realtime"); // 🔤 데이터 타입 선택
  const [data, setData] = useState<DataPoint[]>([]);
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
   * - dataType 파라미터로 realtime 또는 hourly 데이터 선택
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
      // 🔤 데이터 타입 파라미터 추가
      let url = `/api/data/query?from=${startDate}&to=${endDate}&type=${dataType}`;
      if (address) {
        url += `&address=${address}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("데이터 조회 실패");
      }

      const result: QueryResult = await response.json();
      setData(result.data || []);

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
      // 📊 데이터 변환 (name 컬럼 포함)
      const excelData = data.map((point) => ({
        "타임스탐프": new Date(point.timestamp).toLocaleString("ko-KR"),
        "주소": point.address,
        "주소명": point.name || "-", // 🔤 주소의 의미/이름
        "값": point.value,
      }));

      // 워크북 생성
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      // 열 너비 설정
      const colWidths = [
        { wch: 20 }, // 타임스탬프
        { wch: 15 }, // 주소
        { wch: 25 }, // 주소명 (너비 확대)
        { wch: 15 }, // 값
      ];
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
      if (address) {
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

      // 성공 메시지 표시 (3초 후 자동 제거)
      const successMsg = `${result.deletedCount}개의 데이터를 삭제했습니다.`;
      console.log(successMsg);
      setSuccess(successMsg);

      // 3초 후 성공 메시지 자동 제거
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "데이터 삭제 중 오류 발생"
      );
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 초기화
   */
  const handleReset = () => {
    setData([]);
    setError("");
    setSuccess("");
    setAddress("");
    setDeleteDialogOpen(false);
    initializeDateRange();
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
        <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 시작 날짜 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                시작 날짜
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 종료 날짜 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                종료 날짜
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 데이터 타입 선택 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                데이터 타입
              </label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as "realtime" | "hourly")}
                className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="realtime">실시간 센서 데이터</option>
                <option value="hourly">시간별 에너지 데이터</option>
              </select>
            </div>

            {/* 주소 선택 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                주소 (선택사항)
              </label>
              <select
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 주소</option>
                {availableAddresses.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleQuery}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-md font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-700 dark:text-red-400 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/50 text-green-700 dark:text-green-400 rounded-md mb-4">
              {success}
            </div>
          )}

          {/* 결과 통계 */}
          {data.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {data.length}
                </span>
                개의 데이터를 조회했습니다.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  엑셀 다운로드
                </button>
                <button
                  onClick={handleOpenDeleteDialog}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  데이터 삭제
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 데이터 테이블 */}
        {data.length > 0 && (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">
                      타임스탬프
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">
                      주소
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">
                      주소명 (설명)
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-foreground">
                      값
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.slice(0, 100).map((point, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-muted-foreground">
                        {new Date(point.timestamp).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {point.address}
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                          {point.name || "미정의"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-foreground font-semibold">
                        {point.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 정보 */}
            {data.length > 100 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-border text-xs text-muted-foreground">
                처음 100개 행만 표시됩니다. 전체 데이터는 엑셀 파일로 다운로드하세요.
              </div>
            )}
          </div>
        )}

        {/* 빈 상태 */}
        {mounted && data.length === 0 && !loading && !error && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">
              조회된 데이터가 없습니다.
            </p>
            <p className="text-sm text-muted-foreground">
              위의 검색 조건을 입력하고 "조회" 버튼을 클릭하세요.
            </p>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        title="데이터 삭제"
        message={`${startDate} ~ ${endDate}${
          address ? ` (주소: ${address})` : ""
        } 범위의 데이터를 삭제하시겠습니까?`}
        itemCount={data.length}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleting}
      />
    </div>
  );
}
