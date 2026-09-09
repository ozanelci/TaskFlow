import { fetchApi } from "./apiClient"

export async function login(email, password) {
  const data = await fetchApi("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem("access_token", data.access_token)
  return data
}

export async function register(fullName, email, password) {
  return await fetchApi("/register", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName, email, password }),
  })
}

export async function getCurrentUser() {
  return await fetchApi("/me")
}

export async function updateProfile(fullName, email) {
  return await fetchApi("/me", {
    method: "PATCH",
    body: JSON.stringify({ full_name: fullName, email }),
  })
}

export async function changePassword(oldPassword, newPassword) {
  return await fetchApi("/me/password", {
    method: "PATCH",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}

export const loginUser = login;
export const registerUser = register;
