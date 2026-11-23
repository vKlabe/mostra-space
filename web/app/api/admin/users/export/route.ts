import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import {
  shopifyCustomerCsvHeader,
  shopifyCustomerCsvRow,
  shopifyExportDate,
  shopifyExportStart,
} from "@/lib/admin/shopifyCustomerCsv";

export const dynamic = "force-dynamic";

const pageSize = 500;
const profileColumns = "id, email, full_name, display_name";
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function exportError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const access = await requireAdminApi();
  if (!access.ok) {
    return exportError("Accedi con un account amministratore per esportare il CSV.", access.status);
  }

  const parameters = new URL(request.url).searchParams;
  const userId = parameters.get("userId");
  const from = parameters.get("from");
  const now = new Date();
  const today = shopifyExportDate(now);
  const createdFrom = from === null ? null : shopifyExportStart(from);

  if (userId !== null && (!uuid.test(userId) || from !== null)) {
    return exportError("Seleziona un utente o una data di creazione.", 400);
  }
  if (from !== null && (!createdFrom || from > today)) {
    return exportError("Scegli una data di creazione valida fino a oggi.", 400);
  }

  const { admin } = access;
  const csvRows = [shopifyCustomerCsvHeader];
  let filename = `mostra-space-shopify-utenti-${today}.csv`;

  if (userId) {
    const { data, error } = await admin.from("profiles").select(profileColumns)
      .eq("id", userId).maybeSingle();
    if (error) return exportError("Impossibile esportare l’utente. Riprova.", 500);
    if (!data) return exportError("Utente non trovato.", 404);
    csvRows.push(shopifyCustomerCsvRow(data));
    filename = `mostra-space-shopify-utente-${userId}.csv`;
  } else {
    const createdThrough = now.toISOString();
    let lastId: string | undefined;
    while (true) {
      let query = admin.from("profiles").select(profileColumns)
        .lte("created_at", createdThrough)
        .order("id")
        .limit(pageSize);
      if (createdFrom) query = query.gte("created_at", createdFrom);
      if (lastId) query = query.gt("id", lastId);

      const { data, error } = await query;
      if (error) return exportError("Impossibile esportare gli utenti. Riprova.", 500);
      if (!data.length) break;

      csvRows.push(...data.map(shopifyCustomerCsvRow));
      lastId = data[data.length - 1].id;
    }
    if (from) filename = `mostra-space-shopify-utenti-dal-${from}-al-${today}.csv`;
  }

  return new Response(csvRows.join("\r\n") + "\r\n", {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
