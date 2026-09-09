import { fetchApi } from "./apiClient"

export async function getUsers() {
  return await fetchApi("/users")
}

export async function getUser(userId) {
  return await fetchApi("/users/" + userId)
}

export async function deleteUser(userId) {
  return await fetchApi("/users/" + userId, { method: "DELETE" })
}
