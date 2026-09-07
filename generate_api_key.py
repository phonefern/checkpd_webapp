#!/usr/bin/env python3
"""Generate secure random API keys or deterministic keys from text."""

from __future__ import annotations

import argparse
import hashlib
import secrets
import string


DEFAULT_LENGTH = 32
SAFE_ALPHABET = string.ascii_letters + string.digits


def generate_random_key(length: int = DEFAULT_LENGTH) -> str:
    """Generate a cryptographically secure random API key."""
    if length < 16:
        raise ValueError("length must be at least 16 characters")

    return "".join(secrets.choice(SAFE_ALPHABET) for _ in range(length))


def generate_key_from_text(text: str, length: int = DEFAULT_LENGTH) -> str:
    """Generate a deterministic key from text using SHA-256."""
    if not text:
        raise ValueError("text must not be empty")
    if length < 16:
        raise ValueError("length must be at least 16 characters")

    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return digest[:length]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an API key")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--text",
        help="Create a deterministic key from this text",
    )
    mode.add_argument(
        "--random",
        action="store_true",
        help="Create a cryptographically secure random key (default)",
    )
    parser.add_argument(
        "--length",
        type=int,
        default=DEFAULT_LENGTH,
        help=f"Key length, minimum 16 (default: {DEFAULT_LENGTH})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.text is not None:
        api_key = generate_key_from_text(args.text, args.length)
    else:
        api_key = generate_random_key(args.length)

    print(api_key)


if __name__ == "__main__":
    main()
