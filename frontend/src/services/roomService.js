import { fetchApi } from "./apiClient"

export async function createRoom(name) {
  return await fetchApi("/rooms", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export async function joinRoom(joinCode) {
  return await fetchApi("/rooms/join", {
    method: "POST",
    body: JSON.stringify({ join_code: joinCode }),
  })
}

export async function getRoomRequests(roomId) {
  return await fetchApi("/rooms/" + roomId + "/requests")
}

export async function approveRoomRequest(roomId, membershipId) {
  return await fetchApi("/rooms/" + roomId + "/requests/" + membershipId + "/approve", { method: "POST" })
}

export async function rejectRoomRequest(roomId, membershipId) {
  return await fetchApi("/rooms/" + roomId + "/requests/" + membershipId + "/reject", { method: "POST" })
}

export async function getMyRooms() {
  return await fetchApi("/rooms/my")
}

export async function getRoomMembers(roomId) {
  return await fetchApi("/rooms/" + roomId + "/members")
}
