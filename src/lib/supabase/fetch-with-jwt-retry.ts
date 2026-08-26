const JWT_ISSUED_IN_FUTURE = "PGRST303";

/**
 * PostgREST occasionally rejects a freshly issued JWT with PGRST303 ("JWT issued
 * at future") when its clock is a few seconds behind the Auth server's at the
 * moment the token is validated. The token is valid; retrying shortly after
 * resolves it once the clocks agree. See https://github.com/PostgREST/postgrest/issues/1795
 */
export const fetchWithJwtRetry: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 403) return response;

  let code: string | undefined;
  try {
    code = (await response.clone().json())?.code;
  } catch {
    return response;
  }
  if (code !== JWT_ISSUED_IN_FUTURE) return response;

  await new Promise((resolve) => setTimeout(resolve, 1500));
  return fetch(input, init);
};
