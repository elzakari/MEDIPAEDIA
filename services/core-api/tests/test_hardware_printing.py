"""
==============================================================================
Hardware & Embedded Printing Subsystem Integration Tests
==============================================================================
"""

import asyncio
import base64
import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app


def test_hardware_print_payload_validation():
    """
    Validates invalid base64 and empty payload validation barriers.
    """
    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Invalid base64
            res_bad = await client.post(
                "/api/v1/hardware/print/raw",
                json={
                    "printer_ip": "127.0.0.1",
                    "port": 9100,
                    "raw_base64": "not-valid-base64-%%$#",
                },
            )
            assert res_bad.status_code == 400
            assert "Invalid base64 payload" in res_bad.json()["detail"]

            # 2. Empty payload
            res_empty = await client.post(
                "/api/v1/hardware/print/raw",
                json={
                    "printer_ip": "127.0.0.1",
                    "port": 9100,
                    "raw_base64": "",
                },
            )
            assert res_empty.status_code == 400
            assert "Empty print payload" in res_empty.json()["detail"]

    asyncio.run(_test())


def test_hardware_print_mock_tcp_socket_transmission():
    """
    Spins up a lightweight mock TCP RAW 9100 socket server, transmits ESC/POS binary bytes,
    and asserts end-to-end byte fidelity.
    """
    async def _test():
        received_bytes = bytearray()

        # Define mock TCP printer server
        async def handle_client(reader, writer):
            data = await reader.read(4096)
            received_bytes.extend(data)
            writer.close()
            await writer.wait_closed()

        server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
        port = server.sockets[0].getsockname()[1]

        # Sample ESC/POS byte sequence: [ESC @] [ESC E 1] "TEST PRINT" [LF] [GS V A 0]
        esc_pos_sample = bytes([
            0x1b, 0x40,             # ESC @ (init)
            0x1b, 0x45, 0x01,       # Bold ON
            *b"MEDIPAEDIA THERMAL 80MM TEST",
            0x0a,                   # LF
            0x1d, 0x56, 65, 0x00,   # Cut
        ])
        raw_b64 = base64.b64encode(esc_pos_sample).decode("ascii")

        async with server:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/hardware/print/raw",
                    json={
                        "printer_ip": "127.0.0.1",
                        "port": port,
                        "raw_base64": raw_b64,
                        "timeout_seconds": 3,
                    },
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["bytes_written"] == len(esc_pos_sample)
                assert data["port"] == port

            # Allow server task to complete write
            await asyncio.sleep(0.1)

        # Assert mock server received exact binary sequence
        assert bytes(received_bytes) == esc_pos_sample
        assert b"MEDIPAEDIA THERMAL 80MM TEST" in received_bytes

    asyncio.run(_test())


def test_hardware_print_unreachable_socket_error():
    """
    Validates graceful error handling when target printer IP/port is unreachable.
    """
    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            sample_b64 = base64.b64encode(b"test").decode("ascii")
            # Connect to closed local port
            res = await client.post(
                "/api/v1/hardware/print/raw",
                json={
                    "printer_ip": "127.0.0.1",
                    "port": 59999,
                    "raw_base64": sample_b64,
                    "timeout_seconds": 1,
                },
            )
            assert res.status_code in (502, 504)
            assert "Could not connect" in res.json()["detail"] or "timed out" in res.json()["detail"]

    asyncio.run(_test())
