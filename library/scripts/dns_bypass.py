"""DNS bypass for German CUII blocking.

Resolves hostnames via Google DNS-over-HTTPS and patches socket.getaddrinfo
so all HTTP libraries (requests, urllib) connect to the real IP.

Usage:
    from dns_bypass import dns_context

    with dns_context("libgen.li"):
        requests.get("https://libgen.li/...")  # connects via real IP
"""

from __future__ import annotations

import socket
from contextlib import contextmanager
from unittest.mock import patch

import requests


def resolve_via_google_dns(hostname: str) -> str | None:
    """Resolve a hostname using Google's DNS-over-HTTPS to bypass ISP DNS blocking."""
    try:
        r = requests.get(
            "https://dns.google/resolve",
            params={"name": hostname, "type": "A"},
            timeout=5,
        )
        data = r.json()
        for answer in data.get("Answer", []):
            if answer.get("type") == 1:  # A record
                return answer["data"]
    except Exception:
        pass
    return None


def _patched_getaddrinfo(dns_cache: dict[str, str]):
    """Create a patched getaddrinfo that uses our DNS cache for blocked domains."""
    _original = socket.getaddrinfo

    def _getaddrinfo(host, port, *args, **kwargs):
        if host in dns_cache:
            real_ip = dns_cache[host]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (real_ip, port))]
        return _original(host, port, *args, **kwargs)

    return _getaddrinfo


@contextmanager
def dns_context(*hostnames: str):
    """Context manager that resolves hostnames via Google DNS and patches socket.

    Usage:
        with dns_context("libgen.li", "libgen.rs"):
            # All requests to these hosts go through real IPs
            requests.get("https://libgen.li/...")
    """
    dns_cache: dict[str, str] = {}
    for hostname in hostnames:
        real_ip = resolve_via_google_dns(hostname)
        if real_ip:
            dns_cache[hostname] = real_ip

    with patch("socket.getaddrinfo", _patched_getaddrinfo(dns_cache)):
        yield dns_cache
