/**
 * @file src/app/help/page.tsx
 * @description
 * 도움말 페이지
 * 시스템 사용법, 설정 가이드, 문제 해결 방법을 제공합니다.
 */

"use client";

export default function HelpPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">도움말 및 가이드</h1>
        <p className="text-muted-foreground mt-2">
          PLC 모니터링 시스템 사용을 위한 안내서입니다.
        </p>
      </div>

      {/* 모니터링 가이드 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
            1
          </span>
          모니터링 대시보드
        </h2>
        <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4">
          <div>
            <h3 className="font-medium text-lg mb-2">실시간 현황 (전력)</h3>
            <p className="text-muted-foreground">
              공장의 전체 전력 사용량을 실시간으로 표시합니다. 그래프는 최근
              데이터를 보여주며, 미세한 변화를 감지하기 위해 값의 범위에 따라
              자동으로 확대/축소됩니다.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">온도 현황 (수절/열풍)</h3>
            <p className="text-muted-foreground">
              각 건조로의 현재 온도와 설정 온도를 보여줍니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground ml-2">
              <li>
                <span className="text-red-500 font-medium">빨간색 그래프</span>:
                수절 건조로
              </li>
              <li>
                <span className="text-purple-500 font-medium">
                  보라색 그래프
                </span>
                : 열풍 건조로
              </li>
              <li>
                <span className="text-blue-500 font-medium">점선</span>: 설정
                온도 (목표값)
              </li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-500">
              ⚠️ 알람 발생 조건: 현재 온도가 설정된 최소/최대 범위를 벗어나면
              차트 테두리가 빨간색으로 깜빡입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 설정 가이드 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">
            2
          </span>
          설정 관리
        </h2>
        <div className="bg-card p-6 rounded-lg shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">PLC 연결 설정</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <strong>IP 주소</strong>: PLC 장비의 네트워크 IP
                </li>
                <li>
                  <strong>포트</strong>: Modbus/TCP 포트 (기본값: 502)
                </li>
                <li>
                  <strong>연결 테스트</strong>: 설정된 정보로 즉시 연결을
                  확인합니다.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">모니터링 설정</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <strong>폴링 주기</strong>: 데이터를 읽어오는 간격 (기본값:
                  2000ms)
                </li>
                <li>
                  <strong>전체 화면 시작</strong>: 모니터링 페이지 진입 시 전체
                  화면으로 전환합니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 문제 해결 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm">
            3
          </span>
          문제 해결 (Troubleshooting)
        </h2>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4 py-1">
              <h3 className="font-medium text-red-600 dark:text-red-400">
                PLC 연결 실패가 계속 떠요!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                1. 설정 페이지에서 IP와 포트가 정확한지 확인하세요.
                <br />
                2. "PLC 연결 테스트" 버튼을 눌러보세요.
                <br />
                3. 네트워크 케이블이 빠져있지 않은지 확인하세요.
                <br />
                4. 방화벽이 502 포트를 차단하고 있는지 확인하세요.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4 py-1">
              <h3 className="font-medium text-orange-600 dark:text-orange-400">
                데이터가 갱신되지 않아요!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                일시적인 네트워크 지연일 수 있습니다. 페이지를 새로고침(F5)
                해보세요. 계속되면 폴링 주기를 조금 늘려보세요 (예: 3000ms).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
