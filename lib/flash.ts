export async function readFlash(searchParams: Promise<{ notice?: string; error?: string }>) {
  const query = await searchParams;
  return { notice: query.notice, error: query.error };
}
