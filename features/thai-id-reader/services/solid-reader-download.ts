import type { SolidReaderDownloadOption, SolidReaderPlatform } from "../types";

const LATEST_DOWNLOAD_BASE =
  "https://github.com/SolubleLabs/solid-reader-releases/releases/latest/download/";

const WINDOWS_INSTALLER = "SolId-Reader-Setup.exe";
const MAC_ARM64_ZIP = "SolidReader-darwin-arm64.zip";
const MAC_X64_ZIP = "SolidReader-darwin-x64.zip";

function latestDownload(fileName: string) {
  return `${LATEST_DOWNLOAD_BASE}${fileName}`;
}

export function detectSolidReaderPlatform(): SolidReaderPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  if (/Win/i.test(platform) || /Windows/i.test(userAgent)) return "windows";
  if (/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) return "mac";
  return "unknown";
}

export function getSolidReaderDownloadOptions(
  platform: SolidReaderPlatform = detectSolidReaderPlatform(),
): SolidReaderDownloadOption[] {
  if (platform === "windows") {
    return [
      {
        label: "Download Windows installer",
        fileName: WINDOWS_INSTALLER,
        url: latestDownload(WINDOWS_INSTALLER),
      },
    ];
  }

  if (platform === "mac") {
    return [
      {
        label: "Apple Silicon",
        fileName: MAC_ARM64_ZIP,
        url: latestDownload(MAC_ARM64_ZIP),
      },
      {
        label: "Intel (64-bit)",
        fileName: MAC_X64_ZIP,
        url: latestDownload(MAC_X64_ZIP),
      },
    ];
  }

  return [];
}

export function downloadSolidReader(option: SolidReaderDownloadOption) {
  const anchor = document.createElement("a");
  anchor.href = option.url;
  anchor.download = option.fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
