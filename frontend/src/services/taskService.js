import { fetchApi } from "./apiClient"

export async function getTasks({
  status = "",
  priority = "",
  search = "",
  dueDateFrom = "",
  dueDateTo = "",
  page = 0,
  pageSize = 10,
  sortBy = "id",
  sortOrder = "asc",
  room_id,
  deadline_status,
} = {}) {
  const params = new URLSearchParams()
  if (room_id !== undefined && room_id !== null) params.append("room_id", room_id)
  if (status) params.append("status", status)
  if (priority) params.append("priority", priority)
  if (search) params.append("search", search)
  if (deadline_status) params.append("deadline_status", deadline_status)
  if (dueDateFrom) params.append("due_date_from", dueDateFrom)
  if (dueDateTo) params.append("due_date_to", dueDateTo)
  params.append("skip", page * pageSize)
  params.append("limit", pageSize)
  params.append("sort_by", sortBy)
  params.append("sort_order", sortOrder)

  return await fetchApi("/tasks?" + params.toString())
}

export async function getMyTasks() {
  return await fetchApi("/tasks/my")
}

export async function createTask(taskData) {
  return await fetchApi("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  })
}

export async function getTaskHistory(taskId) {
  return await fetchApi("/tasks/" + taskId + "/history")
}

export async function updateTask(taskId, taskData) {
  return await fetchApi("/tasks/" + taskId, {
    method: "PATCH",
    body: JSON.stringify(taskData),
  })
}

export async function deleteTask(taskId) {
  return await fetchApi("/tasks/" + taskId, { method: "DELETE" })
}

export async function getPersonnel(roomId) {
  const params = new URLSearchParams()
  if (roomId) params.append("room_id", roomId)
  return await fetchApi("/personnel?" + params.toString())
}

export async function getTask(taskId) {
  return await fetchApi("/tasks/" + taskId)
}

export async function getTaskSummary(roomId) {
  const params = new URLSearchParams()
  if (roomId) params.append("room_id", roomId)
  return await fetchApi("/tasks/summary?" + params.toString())
}
