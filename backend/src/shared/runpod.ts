const POLL_INTERVAL_MS = 2000;
// ~2 menit polling tambahan di atas sync-wait bawaan RunPod sendiri — cukup
// untuk cold start worker GPU tanpa membuat request menggantung tanpa batas.
const MAX_POLL_ATTEMPTS = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStatusUrl(baseUrl: string, jobId: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return /\/(run|runsync)$/i.test(trimmed)
    ? trimmed.replace(/\/(run|runsync)$/i, `/status/${jobId}`)
    : `${trimmed}/status/${jobId}`;
}

function isQueuedStatus(status: unknown) {
  return status === "IN_QUEUE" || status === "IN_PROGRESS";
}

function hasFailed(data: any) {
  return data?.status === "FAILED" || Boolean(data?.error);
}

async function pollRunPodStatus(baseUrl: string, jobId: string, headers: Record<string, string>) {
  const statusUrl = buildStatusUrl(baseUrl, jobId);
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const response = await fetch(statusUrl, { headers });
    if (!response.ok) throw new Error(`RunPod status check returned status ${response.status}`);
    const data = await response.json();
    if (hasFailed(data)) throw new Error(`RunPod model failed: ${data?.error || data?.status}`);
    if (!isQueuedStatus(data?.status)) return data;
  }
  throw new Error("RunPod model tidak selesai dalam waktu tunggu maksimum (timeout polling status pekerjaan).");
}

export interface RunPodCallOptions {
  targetUrl: string;
  requestBody: unknown;
  apiKey?: string;
  // true untuk endpoint job-queue RunPod (/run, /runsync) yang membalas
  // { id, status, output }; false untuk endpoint OpenAI-compatible (/v1/chat/completions)
  // yang sudah sinkron dan tidak punya status antrian.
  isJobQueueFormat: boolean;
}

/**
 * Panggil endpoint RunPod dan, khusus format job-queue, tangani kasus
 * IN_QUEUE/IN_PROGRESS dengan polling /status/{id} sampai job selesai.
 * Dibutuhkan karena /runsync hanya sinkron sampai batas waktu tertentu (umumnya
 * ~90 detik) — kalau worker masih cold start saat batas itu tercapai, atau
 * endpoint yang dikonfigurasi adalah /run (async), respons awal tidak berisi
 * output sama sekali walau job masih berjalan normal di background.
 */
export async function callRunPod({ targetUrl, requestBody, apiKey, isJobQueueFormat }: RunPodCallOptions) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`RunPod API returned status ${response.status}: ${body.slice(0, 500)}`);
  }

  let data = await response.json();
  if (hasFailed(data)) throw new Error(`RunPod model failed: ${data?.error || data?.status}`);

  if (isJobQueueFormat && isQueuedStatus(data?.status) && data?.id) {
    data = await pollRunPodStatus(targetUrl, data.id, headers);
  }

  return data;
}
