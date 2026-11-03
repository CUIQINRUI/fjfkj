import argparse
import math
import os
import sys
import time
from pathlib import Path

import serial
from dotenv import load_dotenv
from serial.tools import list_ports
from supabase import create_client

BAUD_RATE = 9600


def load_project_env():
    project_dir = Path(__file__).resolve().parent
    load_dotenv(project_dir / ".env")
    load_dotenv(project_dir / ".vscode" / ".env")


def load_supabase_client():
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            "VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY를 .env에 설정해 주세요."
        )
    return create_client(url, key)


def parse_value(line: bytes) -> float | None:
    text = line.decode("utf-8", errors="replace").strip()
    if not text:
        return None

    try:
        value = float(text)
    except ValueError:
        print(f"숫자가 아닌 시리얼 데이터는 건너뜁니다: {text!r}", file=sys.stderr)
        return None

    if not math.isfinite(value):
        print(f"유효하지 않은 숫자 데이터는 건너뜁니다: {text!r}", file=sys.stderr)
        return None
    return value


def resolve_port(requested_port: str | None) -> str:
    ports = list(list_ports.comports())
    if requested_port:
        if ports and not any(port.device == requested_port for port in ports):
            detected = ", ".join(port.device for port in ports)
            raise RuntimeError(
                f"{requested_port} 포트를 찾을 수 없습니다. 감지된 포트: {detected}. "
                "올바른 포트는 --port 옵션이나 SERIAL_PORT 환경변수로 지정해 주세요."
            )
        return requested_port

    usb_serial_markers = (
        "usbmodem",
        "usbserial",
        "arduino",
        "ch340",
        "cp210",
        "ftdi",
        "usb serial",
    )
    candidates = [
        port
        for port in ports
        if any(
            marker in f"{port.device} {port.description} {port.hwid}".lower()
            for marker in usb_serial_markers
        )
    ]
    if not candidates and len(ports) == 1:
        candidates = ports
    if len(candidates) == 1:
        return candidates[0].device
    if not ports:
        raise RuntimeError(
            "시리얼 포트를 찾지 못했습니다. 아두이노 USB 연결을 확인하거나 "
            "--port 옵션으로 포트를 지정해 주세요."
        )

    detected = ", ".join(port.device for port in (candidates or ports))
    raise RuntimeError(
        f"시리얼 포트를 하나로 결정할 수 없습니다 ({detected}). "
        "--port 옵션이나 SERIAL_PORT 환경변수로 포트를 지정해 주세요."
    )


def main() -> int:
    load_project_env()
    parser = argparse.ArgumentParser(
        description="Arduino serial readings를 Supabase readings 테이블에 전송합니다."
    )
    parser.add_argument(
        "--port",
        default=os.getenv("SERIAL_PORT"),
        help="시리얼 포트 (기본값: SERIAL_PORT 환경변수 또는 자동 감지)",
    )
    parser.add_argument(
        "--list-ports",
        action="store_true",
        help="사용 가능한 시리얼 포트를 표시하고 종료합니다.",
    )
    args = parser.parse_args()

    if args.list_ports:
        ports = list(list_ports.comports())
        if not ports:
            print("사용 가능한 시리얼 포트를 찾지 못했습니다.")
            return 1
        for port in ports:
            print(f"{port.device}: {port.description}")
        return 0

    port_name = resolve_port(args.port)
    print(f"{port_name} 연결 중 ({BAUD_RATE} baud)...", flush=True)
    try:
        with serial.Serial(port_name, BAUD_RATE, timeout=1) as arduino:
            client = load_supabase_client()
            print("연결 완료. 센서 값을 기다립니다. Ctrl+C로 종료합니다.", flush=True)
            pending = bytearray()
            last_data_at = time.monotonic()
            while True:
                chunk = arduino.readline()
                if not chunk:
                    if time.monotonic() - last_data_at >= 5:
                        print(
                            "아직 완성된 한 줄이 수신되지 않았습니다. "
                            "아두이노 코드에서 Serial.println(value)를 사용하고, "
                            "다른 시리얼 모니터는 닫아 주세요.",
                            flush=True,
                        )
                        last_data_at = time.monotonic()
                    continue

                last_data_at = time.monotonic()
                pending.extend(chunk)
                while b"\n" in pending:
                    line, _, remainder = pending.partition(b"\n")
                    pending = bytearray(remainder)
                    line = line.rstrip(b"\r")
                    text = line.decode("utf-8", errors="replace").strip()
                    if not text:
                        continue
                    print(f"시리얼 수신: {text}", flush=True)
                    value = parse_value(line)
                    if value is None:
                        continue
                    print(f"Supabase 저장 중: {value}", flush=True)
                    client.table("readings").insert({"value": value}).execute()
                    print(f"Supabase 저장 완료: {value}", flush=True)
    except serial.SerialException as error:
        raise RuntimeError(
            f"{port_name} 포트를 열거나 읽을 수 없습니다: {error}. "
            "Arduino IDE 시리얼 모니터, VS Code 시리얼 모니터, "
            "브라우저의 시리얼 연결을 모두 닫고 다시 실행해 주세요."
        ) from error


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\n업로드를 종료합니다.")
