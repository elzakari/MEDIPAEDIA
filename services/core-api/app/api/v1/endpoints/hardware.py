"""
==============================================================================
Hardware & Embedded Printing Subsystem API Endpoints
==============================================================================
Provides raw TCP socket bridges for Port 9100 network thermal receipt & label printers.
"""

import asyncio
import base64
import socket
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter()


class RawPrintRequest(BaseModel):
    printer_ip: str = Field(..., description="IPv4 address of network thermal printer", example="192.168.1.200")
    port: int = Field(default=9100, description="RAW socket port (Standard 9100)", example=9100)
    raw_base64: str = Field(..., description="Base64-encoded ESC/POS binary byte stream")
    timeout_seconds: int = Field(default=5, description="Socket connection timeout in seconds")


class RawPrintResponse(BaseModel):
    success: bool
    bytes_written: int
    printer_ip: str
    port: int
    message: str


@router.post("/print/raw", response_model=RawPrintResponse, summary="Send raw binary ESC/POS payload to network printer")
async def send_raw_network_print_job(request: RawPrintRequest):
    """
    Transfers binary ESC/POS payload to a LAN/Wi-Fi thermal receipt or label printer
    listening on TCP Port 9100 (JetDirect / RAW TCP).
    """
    try:
        payload_bytes = base64.b64decode(request.raw_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 payload: {str(e)}",
        )

    if len(payload_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty print payload. Cannot transmit zero bytes.",
        )

    try:
        # Open asynchronous raw socket connection with timeout
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(request.printer_ip, request.port),
            timeout=request.timeout_seconds,
        )

        writer.write(payload_bytes)
        await asyncio.wait_for(writer.drain(), timeout=request.timeout_seconds)

        writer.close()
        await writer.wait_closed()

        return RawPrintResponse(
            success=True,
            bytes_written=len(payload_bytes),
            printer_ip=request.printer_ip,
            port=request.port,
            message=f"Successfully transmitted {len(payload_bytes)} bytes to {request.printer_ip}:{request.port}",
        )

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Connection timed out while attempting to reach thermal printer at {request.printer_ip}:{request.port}",
        )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not connect to thermal printer {request.printer_ip}:{request.port}: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected hardware printing error: {str(e)}",
        )
