import { fetchApi } from "./apiClient"

export async function createTaskRequest(requestData) {
  return await fetchApi("/task-requests", {
    method: "POST",
    body: JSON.stringify(requestData),
  })
}

export async function getTaskRequests({ room_id, status, skip = 0, limit = 50 }) {
  const params = new URLSearchParams()
  if (room_id) params.append("room_id", room_id)
  if (status) params.append("status", status)
  params.append("skip", skip)
  params.append("limit", limit)

  return await fetchApi("/task-requests?" + params.toString())
}

export async function approveTaskRequest(requestId, adminComment) {
  return await fetchApi("/task-requests/" + requestId + "/approve", {
    method: "POST",
    body: JSON.stringify({ admin_comment: adminComment }),
  })
}

export async function rejectTaskRequest(requestId, adminComment) {
  return await fetchApi("/task-requests/" + requestId + "/reject", {
    method: "POST",
    body: JSON.stringify({ admin_comment: adminComment }),
  })
}
