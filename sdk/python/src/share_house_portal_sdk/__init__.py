"""Python SDK for the Share House Portal API."""

from importlib import metadata as _metadata

try:
    __version__ = _metadata.version("share-house-portal-sdk")
except _metadata.PackageNotFoundError:  # pragma: no cover - package metadata missing during development
    __version__ = "0.0.0"

__all__ = ["__version__"]
