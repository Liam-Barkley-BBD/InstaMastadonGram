export async function get(url: string) {
    const backendResponse = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    })
  return backendResponse
}

export async function post(url: string, body: string) {
  const backendResponse = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-type': 'application/json' },
    body: body
  });
  return backendResponse;
}