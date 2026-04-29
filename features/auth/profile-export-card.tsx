"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { ExportAvailabilitySummary } from "@/types/contracts";

type ProfileExportCardProps = {
  availability: ExportAvailabilitySummary;
};

function getOwnedOrchardsLabel(count: number) {
  if (count === 1) {
    return "1 sad";
  }

  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return `${count} sady`;
  }

  return `${count} sadow`;
}

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  return quotedMatch?.[1] ?? null;
}

export function ProfileExportCard({ availability }: ProfileExportCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function handleExport() {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/settings/profile/export", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        let fallbackMessage = "Nie udalo sie wygenerowac eksportu danych konta.";

        try {
          const data = (await response.json()) as { message?: string };
          fallbackMessage = data.message ?? fallbackMessage;
        } catch {
          // Keep the generic message when the response is not JSON.
        }

        setMessageTone("error");
        setMessage(fallbackMessage);
        return;
      }

      const blob = await response.blob();
      const filename =
        getFilenameFromDisposition(response.headers.get("content-disposition")) ??
        "orchardlog-account-export.json";
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      setMessageTone("success");
      setMessage(
        `Plik eksportu jest gotowy do pobrania. Zakres: ${getOwnedOrchardsLabel(availability.owned_orchards_count)} z aktywnym membership owner.`,
      );
    } catch {
      setMessageTone("error");
      setMessage("Nie udalo sie pobrac pliku eksportu. Sprobuj ponownie za chwile.");
    } finally {
      setIsPending(false);
    }
  }

  if (!availability.can_export) {
    return (
      <Card className="grid gap-4" data-testid="profile-export-forbidden">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Eksport danych
          </p>
          <CardTitle>Eksport konta jest teraz zablokowany</CardTitle>
          <CardDescription>
            Ta funkcja jest dostepna tylko dla wlasciciela co najmniej jednego sadu.
            Jesli pracujesz w aplikacji wyłącznie jako `worker`, eksport shared danych
            pozostaje niedostepny.
          </CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4" data-testid="profile-export-card">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Eksport danych
        </p>
        <CardTitle>Eksport konta</CardTitle>
        <CardDescription>
          Pobierz plik JSON z danymi profilu oraz orchard, w ktorych masz aktywne
          membership `owner`. Aktualny zakres eksportu obejmuje {getOwnedOrchardsLabel(availability.owned_orchards_count)}.
        </CardDescription>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          data-testid="profile-export-download"
          disabled={isPending}
          onClick={handleExport}
          type="button"
        >
          {isPending ? "Przygotowywanie eksportu..." : "Pobierz eksport konta"}
        </Button>
      </div>
      {message ? (
        <p
          className={
            messageTone === "success"
              ? "text-sm leading-6 text-[#355139]"
              : "text-sm leading-6 text-[#8d3323]"
          }
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
