/**
 * @file src/lib/mcprotocol.d.ts
 * @description
 * 이 파일은 'mcprotocol' 라이브러리를 위한 TypeScript 타입 정의를 제공합니다.
 * 'mcprotocol' 라이브러리는 주로 미쓰비시 PLC(Programmable Logic Controller)와의 통신을 위해 사용되는 MC 프로토콜을 구현합니다.
 *
 * 이 타입 정의 파일은 TypeScript 프로젝트에서 'mcprotocol' 라이브러리를 사용할 때,
 * 다음과 같은 이점을 제공합니다:
 * 1.  **타입 안전성**: 라이브러리 함수 호출 시 올바른 타입의 인자를 사용하도록 강제하여 런타임 오류를 줄입니다.
 * 2.  **자동 완성**: 개발 환경에서 라이브러리의 인터페이스, 클래스, 메서드 및 속성에 대한 자동 완성을 지원하여 개발 생산성을 향상시킵니다.
 * 3.  **코드 가독성**: 라이브러리의 구조와 사용법을 명확하게 문서화하여 코드를 이해하기 쉽게 만듭니다.
 *
 * 포함된 주요 인터페이스 및 클래스:
 * -   `MCProtocolOptions`: MC 프로토콜 연결 설정을 위한 옵션입니다. (IP 주소, 포트 등)
 * -   `ReadOptions`: PLC에서 데이터를 읽기 위한 옵션입니다. (주소, 길이 등)
 * -   `WriteOptions`: PLC에 데이터를 쓰기 위한 옵션입니다. (주소, 데이터 등)
 * -   `MC` 클래스: MC 프로토콜 통신을 위한 주 클래스로, 연결, 연결 해제, 데이터 읽기/쓰기 메서드를 제공합니다.
 *
 * 이 파일은 런타임에 직접 실행되지 않으며, 오직 TypeScript 컴파일러가 타입 검사를 수행하고 개발 도구가 더 나은 개발 경험을 제공하도록 돕는 역할을 합니다.
 */
declare module 'mcprotocol' {
  export interface MCProtocolOptions {
    ip: string;
    port: number;
    ascii?: boolean;
  }

  export interface ReadOptions {
    address: string;
    length: number;
  }

  export interface WriteOptions {
    address: string;
    data: number | number[];
  }

  class MC {
    constructor(options?: MCProtocolOptions);
    connect(callback?: (err?: Error) => void): void;
    disconnect(callback?: (err?: Error) => void): void;
    read(options: ReadOptions, callback: (err: Error | null, data?: number[]) => void): void;
    write(options: WriteOptions, callback: (err: Error | null) => void): void;
  }

  export default MC;
}
