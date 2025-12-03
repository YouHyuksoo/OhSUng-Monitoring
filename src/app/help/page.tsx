/**
 * @file src/app/help/page.tsx
 * @description
 * 도움말 페이지
 * 시스템 사용법, 설정 가이드, 문제 해결 방법을 제공합니다.
 */

"use client";

import {
  Activity,
  Settings,
  AlertTriangle,
  RefreshCw,
  FileText,
  HelpCircle,
  Database,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10 pb-20">
      <div className="border-b border-border pb-6">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <HelpCircle className="w-10 h-10 text-primary" />
          도움말 및 가이드
        </h1>
        <p className="text-lg text-muted-foreground mt-3">
          전력/온도 모니터링 시스템의 사용 방법과 문제 해결 가이드입니다.
        </p>
      </div>

      {/* 1. 모니터링 대시보드 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
          <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
            1
          </span>
          모니터링 대시보드 상세 가이드
        </h2>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-8">
          {/* 헤더 기능 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-3">
              화면 구성 및 기능
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <li className="bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground block mb-1">
                  상태 표시등 (Live/Offline)
                </strong>
                서버와 PLC 간의 통신 상태를 보여줍니다. 초록색이면 정상,
                빨간색이면 연결 끊김을 의미합니다.
              </li>
              <li className="bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground block mb-1">
                  테마 변경 (해/달 아이콘)
                </strong>
                작업 환경의 조도에 맞춰 화면을 밝게(Light) 또는 어둡게(Dark)
                변경할 수 있습니다.
              </li>
              <li className="bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground block mb-1">
                  전체 화면 모드
                </strong>
                모니터링 페이지 진입 시 자동으로 전체 화면으로 전환되어 몰입감을
                높입니다. (설정에서 변경 가능)
              </li>
              <li className="bg-muted/30 p-3 rounded-lg">
                <strong className="text-foreground block mb-1">
                  나가기 버튼
                </strong>
                모니터링을 종료하고 메인 랜딩 페이지로 돌아갑니다.
              </li>
            </ul>
          </div>

          {/* 차트 상세 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold border-l-4 border-purple-500 pl-3">
              차트 데이터 보는 법
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" /> 전력 모니터링
                </h4>
                <p className="text-sm text-muted-foreground">
                  설비로부터 유효 전력량을 실시간으로 표시합니다. 그래프의
                  높낮이는 전력 사용량의 변화 추이를 나타내며, 우측 상단에 현재
                  수치가 숫자로 표시됩니다.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <ThermometerIcon className="w-4 h-4 text-purple-500" /> 온도
                  모니터링
                </h4>
                <p className="text-sm text-muted-foreground">
                  각 건조로의 온도를 개별 차트로 관리합니다.
                </p>
                <div className="text-sm bg-muted/50 p-3 rounded border border-border space-y-1">
                  <div className="flex justify-between">
                    <span className="text-red-500 font-bold">수절 건조로</span>{" "}
                    <span>빨간색 실선 그래프</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-500 font-bold">
                      열풍 건조로
                    </span>{" "}
                    <span>보라색 실선 그래프</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-500 font-bold">설정 온도</span>{" "}
                    <span>파란색 점선 (목표값)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 알람 시스템 */}
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
            <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              주의: 이상 감지 알람 시스템
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
              설정된 <strong>최소/최대 온도 범위를 벗어날 경우</strong>, 해당
              차트의 테두리가{" "}
              <span className="font-bold underline">
                빨간색으로 깜빡이며 경고
              </span>
              합니다. 이 경우 즉시 해당 장비를 점검해야 합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 2. 설정 및 관리 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
          <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-sm font-bold">
            2
          </span>
          관리자 설정 가이드
        </h2>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-8">
          <p className="text-muted-foreground">
            관리자 페이지(/admin)에서는 시스템의 모든 동작을 제어할 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 일반 설정 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Settings className="w-5 h-5" /> 일반 설정
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>
                  <strong>앱 타이틀</strong>: 상단에 표시될 시스템 이름을
                  변경합니다.
                </li>
                <li>
                  <strong>폴링 주기</strong>: PLC에서 데이터를 가져오는
                  간격입니다. (기본 2000ms = 2초)
                </li>
                <li>
                  <strong>데이터 보관 기간</strong>: DB에 저장된 로그 데이터를
                  며칠간 보관할지 설정합니다.
                </li>
              </ul>
            </div>

            {/* PLC 연결 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <RefreshCw className="w-5 h-5" /> PLC 연결 설정
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>
                  <strong>IP 주소 & 포트</strong>: 현장 PLC 장비의 네트워크
                  정보를 입력합니다.
                </li>
                <li>
                  <strong>연결 테스트</strong>: 입력한 정보로 통신이 가능한지
                  즉시 확인합니다.
                </li>
              </ul>
            </div>

            {/* 차트 구성 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Activity className="w-5 h-5" /> 차트 구성 관리
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                모니터링 화면에 표시될 차트를 추가하거나 수정합니다.
              </p>
              <div className="bg-muted/30 p-3 rounded text-sm space-y-2">
                <p>
                  <strong>주소(Address)</strong>: PLC 메모리 번지 (예: D4032)
                </p>
                <p>
                  <strong>설정 주소</strong>: 목표 온도가 저장된 번지 (선택
                  사항)
                </p>
                <p>
                  <strong>임계값</strong>: 알람이 울릴 최소/최대 온도를
                  지정합니다.
                </p>
              </div>
            </div>

            {/* 데이터 관리 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Database className="w-5 h-5" /> 데이터베이스 관리
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>
                  <strong>로그 확인</strong>: 시스템 에러나 동작 이력을
                  조회합니다.
                </li>
                <li>
                  <strong>DB 초기화</strong>: 저장된 모든 데이터를 삭제하고 초기
                  상태로 되돌립니다. (주의 필요)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 문제 해결 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
          <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center text-sm font-bold">
            3
          </span>
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-4">
          <details className="group p-4 bg-muted/30 rounded-lg open:bg-muted/50 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <span className="text-red-500">Q.</span>
                PLC 연결 실패 알림이 계속 떠요.
              </span>
              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="mt-3 pl-6 text-sm text-muted-foreground space-y-2 border-l-2 border-red-200 dark:border-red-900/50 ml-1">
              <p>
                1. 설정 페이지에서 IP 주소와 포트 번호가 정확한지 확인하세요.
              </p>
              <p>
                2. 랜선이 빠져있거나 공유기 전원이 꺼져있지 않은지 확인하세요.
              </p>
              <p>3. 방화벽 설정에서 502 포트가 차단되어 있는지 확인하세요.</p>
            </div>
          </details>

          <details className="group p-4 bg-muted/30 rounded-lg open:bg-muted/50 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <span className="text-orange-500">Q.</span>
                데이터가 갱신되지 않고 멈춰있어요.
              </span>
              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="mt-3 pl-6 text-sm text-muted-foreground space-y-2 border-l-2 border-orange-200 dark:border-orange-900/50 ml-1">
              <p>
                일시적인 네트워크 지연일 수 있습니다. 페이지를 새로고침(F5)
                해보세요.
              </p>
              <p>
                계속되면 관리자 페이지에서 '폴링 서비스' 상태를 확인하고
                재시작해주세요.
              </p>
            </div>
          </details>

          <details className="group p-4 bg-muted/30 rounded-lg open:bg-muted/50 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <span className="text-blue-500">Q.</span>
                업그레이드 버튼을 눌렀는데 반응이 없어요.
              </span>
              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="mt-3 pl-6 text-sm text-muted-foreground space-y-2 border-l-2 border-blue-200 dark:border-blue-900/50 ml-1">
              <p>서버가 인터넷에 연결되어 있어야 합니다.</p>
              <p>
                업그레이드 중에는 서버가 재시작되므로 잠시 연결이 끊길 수
                있습니다. 1분 정도 기다린 후 새로고침 해보세요.
              </p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

function ThermometerIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  );
}
